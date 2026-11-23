# SmartCRM AI — Background Job Architecture & Queue Engine

## 1. Executive Summary

SmartCRM AI includes an in-process, persistent background job queue backed directly by MongoDB collections (`JobExecution`). This eliminates the operational overhead and single-point-of-failure risks of external Redis/RabbitMQ brokers for standard deployments, while providing enterprise features:
- **Atomic Concurrency & Job Claiming**: Prevents race conditions and duplicate executions across horizontal replicas using atomic MongoDB `findOneAndUpdate`.
- **Exponential Backoff Retries**: Failed jobs retry up to `maxRetries` (default: 3) with configurable delays before being marked as permanently failed.
- **Graceful Shutdown**: The worker cleanly terminates in-flight jobs and releases locks when receiving `SIGTERM` or `SIGINT`.
- **Real-Time Job Queue Metrics**: Admin endpoint `GET /api/v1/jobs/metrics` exposes live queue depth, pending jobs, failure counts, and retry histories.

---

## 2. Architecture & Execution Loop

```
+-----------------------------------------------------------------------------------------+
|                                    Enqueue Operation                                    |
|   enqueueJob({ jobType, payload, organizationId, priority, runAt })                     |
|   Creates JobExecution record with status: 'pending'                                    |
+-----------------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------------+
|                               Worker Polling Loop (5s)                                  |
|   Finds job with status: 'pending', runAt <= now                                        |
|   Atomic Lock:                                                                          |
|     findOneAndUpdate(                                                                   |
|       { _id: candidate._id, status: 'pending' },                                        |
|       { status: 'running', lockedBy: workerId, lockedAt: new Date() }                   |
|     )                                                                                   |
+-----------------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------------+
|                                    Handler Execution                                    |
|   Handlers Map:                                                                         |
|     - scan_subscription_renewals : Scans expiring subscriptions, creates invoices/alerts|
|     - scan_overdue_invoices      : Flags invoices past due date, triggers alerts        |
|     - monitor_support_ticket_sla : Checks SLA response timers, escalates breaches       |
|     - send_queued_email          : Dispatches batched email jobs                        |
+-----------------------------------------------------------------------------------------+
                                   /             \
                      Success     /               \    Error
                                 v                 v
                 +-----------------------+ +---------------------------------------+
                 | Status: 'completed'   | | attempts < maxRetries ?               |
                 | completedAt: now      | |   status: 'pending', runAt: backoff   |
                 | Execution log saved   | | : status: 'failed', error logged      |
                 +-----------------------+ +---------------------------------------+
```

---

## 3. Atomic Job Claiming Algorithm

To guarantee that multiple server nodes do not execute the same job simultaneously, the worker uses atomic conditional updates:

```javascript
export const claimNextJob = async (workerId = `worker_${process.pid}`) => {
  const now = new Date();

  // Reset stale locks (workers that crashed mid-execution > 5 mins ago)
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
  await JobExecution.updateMany(
    { status: 'running', lockedAt: { $lt: staleThreshold } },
    { $set: { status: 'pending', lockedBy: null, lockedAt: null } }
  );

  // Atomically claim the highest priority, oldest pending job
  const job = await JobExecution.findOneAndUpdate(
    {
      status: 'pending',
      runAt: { $lte: now },
    },
    {
      $set: {
        status: 'running',
        lockedBy: workerId,
        lockedAt: now,
        startedAt: now,
      },
      $inc: { attempts: 1 },
    },
    {
      sort: { priority: -1, runAt: 1 },
      new: true,
    }
  );

  return job;
};
```

---

## 4. Built-in Automated Periodic Jobs

The system registers scheduled recurring tasks:

| Job Type | Schedule | Actions Performed |
| :--- | :--- | :--- |
| `scan_subscription_renewals` | Every 6 hours | Finds subscriptions renewing within 7 days. Generates renewal invoices, sends `renewal_reminder` emails to customers, and logs renewal events. |
| `scan_overdue_invoices` | Every 12 hours | Finds invoices where `status === 'sent'` and `dueDate < now`. Transitions status to `overdue`, sends payment reminders, and creates high-priority alerts for account executives. |
| `monitor_support_ticket_sla` | Every 15 minutes | Checks open support tickets against priority SLA windows (Urgent: 2h, High: 8h, Medium: 24h). Creates escalation notifications for overdue tickets. |
| `send_queued_email` | Immediate / 5s | Processes async outbound emails queued during bulk operations without blocking interactive API endpoints. |

---

## 5. Administration & Monitoring API

- `GET /api/v1/jobs/metrics`: Exposes overall queue health:
  ```json
  {
    "success": true,
    "metrics": {
      "pending": 2,
      "running": 1,
      "completed": 450,
      "failed": 3
    },
    "recentExecutions": [...]
  }
  ```
- `POST /api/v1/jobs/trigger`: Allows administrators to manually trigger immediate runs of `scan_subscription_renewals`, `scan_overdue_invoices`, or `monitor_support_ticket_sla`.
- `POST /api/v1/jobs/:id/retry`: Resets a failed job to `pending` with `runAt = now` for immediate reprocessing.
