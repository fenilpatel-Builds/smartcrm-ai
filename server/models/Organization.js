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
  },
  {
    timestamps: true,
  }
);

export const Organization = mongoose.model('Organization', organizationSchema);
