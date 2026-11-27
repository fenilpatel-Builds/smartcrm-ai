import crypto from 'crypto';
import { WebhookSubscription } from '../../models/WebhookSubscription.js';
import { logAudit } from '../audit/auditService.js';

/**
 * Dispatches an event payload to all matching active webhook subscriptions
 */
export const dispatchWebhookEvent = async (organizationId, eventName, payloadData = {}) => {
  if (!organizationId || !eventName) return [];

  try {
    const subscriptions = await WebhookSubscription.find({
      organizationId,
      isActive: true,
      events: eventName,
    });

    if (!subscriptions || subscriptions.length === 0) {
      return [];
    }

    const results = [];

    for (const sub of subscriptions) {
      const deliveryId = `del_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const timestamp = new Date().toISOString();

      const envelope = {
        id: deliveryId,
        event: eventName,
        createdAt: timestamp,
        organizationId,
        data: payloadData,
      };

      const payloadString = JSON.stringify(envelope);
      const signature = crypto
        .createHmac('sha256', sub.secretKey)
        .update(payloadString)
        .digest('hex');

      try {
        const response = await fetch(sub.targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SmartCRM-Webhook-Dispatcher/1.0',
            'X-SmartCRM-Event': eventName,
            'X-SmartCRM-Delivery': deliveryId,
            'X-SmartCRM-Signature': signature,
            'X-SmartCRM-Timestamp': timestamp,
          },
          body: payloadString,
          signal: AbortSignal.timeout(5000), // 5-second timeout
        });

        sub.lastTriggeredAt = new Date();
        sub.lastStatusCode = response.status;

        if (response.ok) {
          sub.failureCount = 0;
          sub.lastError = '';
          results.push({ subscriptionId: sub._id, deliveryId, status: 'delivered', statusCode: response.status });
        } else {
          sub.failureCount = (sub.failureCount || 0) + 1;
          sub.lastError = `HTTP ${response.status} ${response.statusText}`;
          results.push({ subscriptionId: sub._id, deliveryId, status: 'failed', statusCode: response.status, error: sub.lastError });
        }
      } catch (reqErr) {
        sub.lastTriggeredAt = new Date();
        sub.failureCount = (sub.failureCount || 0) + 1;
        sub.lastStatusCode = 0;
        sub.lastError = reqErr.message || 'Network dispatch error';
        results.push({ subscriptionId: sub._id, deliveryId, status: 'error', error: sub.lastError });
      }

      // Auto-disable webhook if 10 consecutive failures
      if (sub.failureCount >= 10) {
        sub.isActive = false;
        sub.lastError = 'Disabled automatically due to 10 consecutive delivery failures.';
      }

      await sub.save();
    }

    return results;
  } catch (err) {
    console.error('[WebhookDispatcher] Error dispatching webhook:', err.message);
    return [];
  }
};
