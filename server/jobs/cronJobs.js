import cron from 'node-cron';
import { Subscription } from '../models/Subscription.js';
import { Invoice } from '../models/Invoice.js';
import { Task } from '../models/Task.js';
import { Customer } from '../models/Customer.js';
import { Notification } from '../models/Notification.js';
import { analyzeChurnRisk } from '../services/ai/churnPredictionService.js';

export const initBackgroundJobs = () => {
  console.log('[Automation] Initializing SmartCRM scheduled background jobs...');

  // 1. Daily at 08:00 AM: Scan for upcoming renewals and generate notifications
  cron.schedule('0 8 * * *', async () => {
    console.log('[Automation] Running scheduled task: Upcoming Renewals Scan...');
    try {
      const now = new Date();
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const renewingSubs = await Subscription.find({
        status: 'active',
        nextRenewalDate: { $gte: now, $lte: in7Days },
      }).populate('customerId', 'name company');

      for (const sub of renewingSubs) {
        // Prevent duplicate notification within 3 days
        const recentNotif = await Notification.findOne({
          organizationId: sub.organizationId,
          type: 'renewal',
          'relatedEntity.entityId': sub._id,
          createdAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        });

        if (!recentNotif && sub.customerId) {
          const daysLeft = Math.ceil((new Date(sub.nextRenewalDate) - now) / (1000 * 60 * 60 * 24));
          await Notification.create({
            organizationId: sub.organizationId,
            title: 'Upcoming Subscription Renewal',
            message: `${sub.customerId.name} (${sub.customerId.company || 'Customer'}) has an active subscription renewing in ${daysLeft} day(s) ($${sub.amount}).`,
            type: 'renewal',
            relatedEntity: {
              entityType: 'Subscription',
              entityId: sub._id,
            },
          });
        }
      }
    } catch (err) {
      console.error('[Automation] Error during upcoming renewals scan:', err);
    }
  });

  // 2. Daily at 09:00 AM: Scan for overdue invoices and generate billing alerts
  cron.schedule('0 9 * * *', async () => {
    console.log('[Automation] Running scheduled task: Overdue Payments Scan...');
    try {
      const now = new Date();
      const overdueInvoices = await Invoice.find({
        dueDate: { $lt: now },
        balanceDue: { $gt: 0 },
        status: { $in: ['sent', 'partially_paid', 'overdue'] },
      }).populate('customerId', 'name company');

      for (const inv of overdueInvoices) {
        inv.status = 'overdue';
        await inv.save();

        const recentNotif = await Notification.findOne({
          organizationId: inv.organizationId,
          type: 'overdue_payment',
          'relatedEntity.entityId': inv._id,
          createdAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        });

        if (!recentNotif && inv.customerId) {
          await Notification.create({
            organizationId: inv.organizationId,
            title: 'Invoice Payment Overdue',
            message: `Invoice #${inv.invoiceNumber} for ${inv.customerId.name} is overdue. Balance due: $${inv.balanceDue.toFixed(2)}.`,
            type: 'overdue_payment',
            relatedEntity: {
              entityType: 'Invoice',
              entityId: inv._id,
            },
          });
        }
      }
    } catch (err) {
      console.error('[Automation] Error during overdue payment scan:', err);
    }
  });

  // 3. Hourly: Scan for pending tasks due in the next 24 hours
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const dueTasks = await Task.find({
        status: { $in: ['pending', 'in_progress'] },
        dueDate: { $gte: now, $lte: in24Hours },
      }).populate('customerId', 'name');

      for (const task of dueTasks) {
        const recentNotif = await Notification.findOne({
          organizationId: task.organizationId,
          type: 'task_reminder',
          'relatedEntity.entityId': task._id,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });

        if (!recentNotif) {
          await Notification.create({
            organizationId: task.organizationId,
            userId: task.assignedTo,
            title: `Task Reminder: ${task.title}`,
            message: `Task is due soon (${new Date(task.dueDate).toLocaleDateString()}). Priority: ${task.priority.toUpperCase()}.`,
            type: 'task_reminder',
            relatedEntity: {
              entityType: 'Task',
              entityId: task._id,
            },
          });
        }
      }
    } catch (err) {
      console.error('[Automation] Error during task reminder scan:', err);
    }
  });

  console.log('[Automation] Scheduled background jobs initialized successfully.');
};
