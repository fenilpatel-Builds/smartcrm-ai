import mongoose from 'mongoose';

const webhookSubscriptionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Webhook name is required'],
      trim: true,
    },
    targetUrl: {
      type: String,
      required: [true, 'Target URL is required'],
      trim: true,
    },
    secretKey: {
      type: String,
      required: true,
    },
    events: [
      {
        type: String,
        enum: [
          'deal.won',
          'deal.created',
          'customer.created',
          'customer.updated',
          'payment.captured',
          'payment.failed',
          'invoice.created',
          'invoice.overdue',
          'ticket.created',
          'subscription.renewed',
        ],
        required: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastTriggeredAt: {
      type: Date,
    },
    lastStatusCode: {
      type: Number,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

webhookSubscriptionSchema.index({ organizationId: 1, isActive: 1 });

export const WebhookSubscription = mongoose.model('WebhookSubscription', webhookSubscriptionSchema);
