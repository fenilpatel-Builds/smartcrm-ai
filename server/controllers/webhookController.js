import crypto from 'crypto';
import { WebhookSubscription } from '../models/WebhookSubscription.js';
import { dispatchWebhookEvent } from '../services/webhook/webhookDispatcherService.js';
import { logAudit } from '../services/audit/auditService.js';

export const listWebhooks = async (req, res, next) => {
  try {
    const webhooks = await WebhookSubscription.find({ organizationId: req.user.organizationId })
      .sort({ createdAt: -1 });

    // Mask secret keys in response
    const sanitized = webhooks.map((w) => {
      const obj = w.toObject();
      obj.secretKeyMasked = obj.secretKey ? `${obj.secretKey.substring(0, 6)}••••••••` : '';
      delete obj.secretKey;
      return obj;
    });

    return res.json({ success: true, webhooks: sanitized });
  } catch (error) {
    next(error);
  }
};

export const createWebhook = async (req, res, next) => {
  try {
    const { name, targetUrl, events } = req.body;

    if (!name || !targetUrl || !events || !events.length) {
      return res.status(400).json({ success: false, message: 'Name, targetUrl, and at least one event are required.' });
    }

    try {
      new URL(targetUrl);
    } catch {
      return res.status(400).json({ success: false, message: 'Target URL must be a valid HTTP or HTTPS URL.' });
    }

    const secretKey = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const webhook = await WebhookSubscription.create({
      organizationId: req.user.organizationId,
      name,
      targetUrl,
      secretKey,
      events,
      createdBy: req.user._id,
    });

    await logAudit({
      organizationId: req.user.organizationId,
      userId: req.user._id,
      action: 'WEBHOOK_CREATED',
      entityType: 'WebhookSubscription',
      entityId: webhook._id,
      metadata: { name, targetUrl, events },
    });

    return res.status(201).json({
      success: true,
      message: 'Webhook subscription created successfully.',
      webhook: {
        ...webhook.toObject(),
        secretKey, // Returned once upon creation so admin can copy it
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, targetUrl, events, isActive } = req.body;

    const webhook = await WebhookSubscription.findOne({
      _id: id,
      organizationId: req.user.organizationId,
    });

    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook subscription not found.' });
    }

    if (name) webhook.name = name;
    if (targetUrl) webhook.targetUrl = targetUrl;
    if (events) webhook.events = events;
    if (typeof isActive === 'boolean') {
      webhook.isActive = isActive;
      if (isActive) webhook.failureCount = 0; // Reset failure count on manual reactivation
    }

    await webhook.save();
    return res.json({ success: true, message: 'Webhook updated successfully.', webhook });
  } catch (error) {
    next(error);
  }
};

export const deleteWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await WebhookSubscription.findOneAndDelete({
      _id: id,
      organizationId: req.user.organizationId,
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Webhook not found.' });
    }

    return res.json({ success: true, message: 'Webhook subscription deleted.' });
  } catch (error) {
    next(error);
  }
};

export const testWebhook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const webhook = await WebhookSubscription.findOne({
      _id: id,
      organizationId: req.user.organizationId,
    });

    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found.' });
    }

    const testEvent = webhook.events[0] || 'deal.won';
    const samplePayload = {
      test: true,
      message: 'This is a SmartCRM AI test webhook delivery.',
      timestamp: new Date().toISOString(),
      organization: { id: req.user.organizationId },
    };

    const results = await dispatchWebhookEvent(req.user.organizationId, testEvent, samplePayload);

    return res.json({
      success: true,
      message: 'Test webhook dispatched.',
      results,
    });
  } catch (error) {
    next(error);
  }
};
