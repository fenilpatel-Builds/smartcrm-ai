import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: 'USA' },
      zipCode: { type: String, default: '' },
    },
    logo: {
      type: String,
      default: '',
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    timezone: {
      type: String,
      default: 'America/New_York',
    },
    settings: {
      taxRate: { type: Number, default: 0 },
      taxId: { type: String, default: '' },
      invoicePrefix: { type: String, default: 'INV' },
      renewalNoticeDays: { type: Number, default: 7 },
      overdueNoticeDays: { type: Number, default: 3 },
      enableAutoRenewals: { type: Boolean, default: true },
    },
    subscriptionConfiguration: {
      planName: { type: String, default: 'Enterprise SaaS' },
      status: { type: String, default: 'active' },
      maxUsers: { type: Number, default: 50 },
    },
    integrations: {
      payment: {
        provider: { type: String, enum: ['razorpay', 'stripe', 'sandbox'], default: 'sandbox' },
        keyId: { type: String, default: '' },
        keySecret: { type: String, default: '' },
        webhookSecret: { type: String, default: '' },
        mode: { type: String, enum: ['test', 'live'], default: 'test' },
        currency: { type: String, default: 'INR' },
      },
      email: {
        provider: { type: String, enum: ['smtp', 'resend', 'sendgrid', 'mock'], default: 'mock' },
        fromName: { type: String, default: 'SmartCRM Team' },
        fromEmail: { type: String, default: '' },
        smtpHost: { type: String, default: '' },
        smtpPort: { type: Number, default: 587 },
        smtpUser: { type: String, default: '' },
        smtpPassword: { type: String, default: '' },
        apiKey: { type: String, default: '' },
      },
    },
    onboarding: {
      isCompleted: { type: Boolean, default: false },
      step: { type: Number, default: 1 },
    },
    planLimits: {
      maxUsers: { type: Number, default: 25 },
      maxCustomers: { type: Number, default: 500 },
      maxContacts: { type: Number, default: 1000 },
      maxDeals: { type: Number, default: 200 },
      maxStorageMB: { type: Number, default: 1024 },
      monthlyEmailAllowance: { type: Number, default: 2000 },
      emailsSentThisMonth: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export const Organization = mongoose.model('Organization', organizationSchema);
