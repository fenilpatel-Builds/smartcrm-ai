import { JobExecution } from '../../models/JobExecution.js';
import { Subscription } from '../../models/Subscription.js';
import { Invoice } from '../../models/Invoice.js';
import { SupportTicket } from '../../models/SupportTicket.js';
import { Notification } from '../../models/Notification.js';
import * as emailService from '../email/emailService.js';

let workerIntervalId = null;
let isShuttingDown = false;
const WORKER_ID = `worker_${process.pid}_${Math.floor(Math.random() * 1000)}`;

/**
 * Enqueues a persistent background job into MongoDB
 */
export const enqueueJob = async ({
  jobName,
  organizationId,
  queue = 'default',
  payload = {},
  scheduledFor = new Date(),
  maxAttempts = 3,
}) => {
  const job = await JobExecution.create({
    jobName,
    organizationId,
    queue,
    payload,
    scheduledFor,
    maxAttempts,
    status: 'pending',
  });
  return job;
};

/**
 * Job Handlers Registry
 */
const jobHandlers = {
  // Scans for subscriptions due for renewal within 7-14 days
  scan_subscription_renewals: async (payload) => {
    const now = new Date();
    const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const renewing = await Subscription.find({
      status: 'active',
      nextRenewalDate: { $gte: now, $lte: in14Days },
    }).populate('customerId', 'name email company');

    let createdNotifs = 0;
    for (const sub of renewing) {
      const recent = await Notification.findOne({
        organizationId: sub.organizationId,
        type: 'renewal',
        'relatedEntity.entityId': sub._id,
        createdAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      });

      if (!recent && sub.customerId) {
        const days = Math.ceil((new Date(sub.nextRenewalDate) - now) / (1000 * 60 * 60 * 24));
        await Notification.create({
          organizationId: sub.organizationId,
          title: 'Subscription Renewal Alert',
          message: `${sub.customerId.name} (${sub.customerId.company || 'Customer'}) subscription renews in ${days} days.`,
          type: 'renewal',
          relatedEntity: { entityType: 'Subscription', entityId: sub._id },
        });
        createdNotifs++;
      }
    }
    return { scanned: renewing.length, notificationsCreated: createdNotifs };
  },

  // Flags overdue invoices past dueDate
  scan_overdue_invoices: async (payload) => {
    const now = new Date();
    const overdue = await Invoice.find({
      dueDate: { $lt: now },
      balanceDue: { $gt: 0 },
      status: { $in: ['sent', 'partially_paid', 'overdue'] },
    }).populate('customerId', 'name email company');

    let updatedCount = 0;
    for (const inv of overdue) {
      if (inv.status !== 'overdue') {
        inv.status = 'overdue';
        await inv.save();
        updatedCount++;
      }
    }
    return { overdueFound: overdue.length, updatedToOverdue: updatedCount };
  },

  // Scans for urgent support tickets pending response > 4 hours
  monitor_support_ticket_sla: async (payload) => {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const breachingTickets = await SupportTicket.find({
      status: { $in: ['open', 'in_progress'] },
      priority: { $in: ['urgent', 'high'] },
      createdAt: { $lt: fourHoursAgo },
    }).populate('customerId', 'name company');

    let alertsIssued = 0;
    for (const ticket of breachingTickets) {
      const existingAlert = await Notification.findOne({
        organizationId: ticket.organizationId,
        type: 'system',
        'relatedEntity.entityId': ticket._id,
        createdAt: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
      });

      if (!existingAlert) {
        await Notification.create({
          organizationId: ticket.organizationId,
          userId: ticket.assignedTo,
          title: `SLA Alert: Ticket #${ticket.ticketNumber}`,
          message: `Ticket "${ticket.subject}" has exceeded SLA response threshold (4 hrs). Priority: ${ticket.priority.toUpperCase()}`,
          type: 'system',
          relatedEntity: { entityType: 'SupportTicket', entityId: ticket._id },
        });
        alertsIssued++;
      }
    }
    return { breachedCount: breachingTickets.length, alertsIssued };
  },

  // Sends transactional email asynchronously
  send_queued_email: async (payload) => {
    const result = await emailService.sendEmail(payload);
    return { emailLogId: result._id, status: result.status };
  },
};

/**
 * Processes a single job atomically with retry backoff and failure logging
 */
export const processNextJob = async () => {
  if (isShuttingDown) return null;

  // Atomically acquire next eligible job
  const now = new Date();
  const job = await JobExecution.findOneAndUpdate(
    {
      status: { $in: ['pending', 'retrying'] },
      scheduledFor: { $lte: now },
    },
    {
      $set: {
        status: 'running',
        lockedAt: now,
        lockedBy: WORKER_ID,
      },
      $inc: { attempts: 1 },
    },
    { sort: { scheduledFor: 1 }, new: true }
  );

  if (!job) return null;

  const startTime = Date.now();
  const handler = jobHandlers[job.jobName];

  try {
    if (!handler) {
      throw new Error(`No registered handler for job: ${job.jobName}`);
    }

    const output = await handler(job.payload);

    job.status = 'completed';
    job.completedAt = new Date();
    job.durationMs = Date.now() - startTime;
    job.lastError = '';
    job.lockedAt = undefined;
    job.lockedBy = undefined;
    await job.save();

    return { job, output };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const hasMoreAttempts = job.attempts < job.maxAttempts;

    job.durationMs = durationMs;
    job.lastError = err.message || 'Unknown execution failure';
    job.lockedAt = undefined;
    job.lockedBy = undefined;

    if (hasMoreAttempts) {
      // Exponential backoff: 2^attempts * 15 seconds
      const backoffSecs = Math.pow(2, job.attempts) * 15;
      job.status = 'retrying';
      job.scheduledFor = new Date(Date.now() + backoffSecs * 1000);
    } else {
      job.status = 'failed';
    }

    await job.save();
    return { job, error: err.message };
  }
};

/**
 * Starts background worker polling loop
 */
export const startJobWorker = (intervalMs = 5000) => {
  if (workerIntervalId) return;

  console.log(`[JobQueue] Background worker initialized (${WORKER_ID}), polling every ${intervalMs}ms`);

  workerIntervalId = setInterval(async () => {
    try {
      await processNextJob();
    } catch (err) {
      console.error('[JobQueue] Error during job processing tick:', err);
    }
  }, intervalMs);
};

/**
 * Stops worker cleanly during graceful shutdown
 */
export const stopJobWorker = () => {
  isShuttingDown = true;
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    console.log('[JobQueue] Background worker polling stopped cleanly.');
  }
};

/**
 * Retries a failed job manually
 */
export const retryJob = async (jobId) => {
  const job = await JobExecution.findById(jobId);
  if (!job) throw new Error('Job execution record not found.');

  job.status = 'pending';
  job.scheduledFor = new Date();
  job.lastError = '';
  await job.save();

  return job;
};

/**
 * Returns queue health and statistics for Admin Observability
 */
export const getQueueMetrics = async () => {
  const [pending, running, completed, failed, retrying] = await Promise.all([
    JobExecution.countDocuments({ status: 'pending' }),
    JobExecution.countDocuments({ status: 'running' }),
    JobExecution.countDocuments({ status: 'completed' }),
    JobExecution.countDocuments({ status: 'failed' }),
    JobExecution.countDocuments({ status: 'retrying' }),
  ]);

  const recentJobs = await JobExecution.find().sort({ createdAt: -1 }).limit(15);

  return {
    summary: { pending, running, completed, failed, retrying, total: pending + running + completed + failed + retrying },
    recentJobs,
    workerId: WORKER_ID,
  };
};
