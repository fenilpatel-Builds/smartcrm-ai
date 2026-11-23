import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    recipient: {
      name: { type: String, default: '' },
      email: { type: String, required: true, trim: true, lowercase: true, index: true },
    },
    sender: {
      name: { type: String, default: 'SmartCRM Team' },
      email: { type: String, default: '' },
    },
    subject: {
      type: String,
      required: [true, 'Email subject is required'],
      trim: true,
    },
    htmlBody: {
      type: String,
      default: '',
    },
    textBody: {
      type: String,
      default: '',
    },
    templateType: {
      type: String,
      enum: [
        'custom',
        'lead_follow_up',
        'customer_onboarding',
        'invoice_notice',
        'renewal_reminder',
        'payment_failed',
        'ticket_update',
        'meeting_invite',
        'password_reset',
      ],
      default: 'custom',
      index: true,
    },
    status: {
      type: String,
      enum: ['drafted', 'queued', 'sent', 'delivered', 'failed', 'bounced'],
      default: 'sent',
      index: true,
    },
    provider: {
      type: String,
      enum: ['smtp', 'resend', 'sendgrid', 'mock'],
      default: 'mock',
    },
    providerMessageId: {
      type: String,
      default: '',
      index: true,
    },
    error: {
      type: String,
      default: '',
    },
    relatedEntityType: {
      type: String,
      enum: ['customer', 'lead', 'invoice', 'subscription', 'deal', 'ticket', 'general'],
      default: 'general',
      index: true,
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isTestEmail: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

emailLogSchema.index({ organizationId: 1, status: 1 });
emailLogSchema.index({ organizationId: 1, sentAt: -1 });

export const EmailLog = mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;
