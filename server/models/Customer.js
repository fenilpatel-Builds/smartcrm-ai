import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      index: true,
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: 'USA' },
      zipCode: { type: String, default: '' },
    },
    source: {
      type: String,
      enum: ['website', 'referral', 'cold_outreach', 'inbound', 'advertising', 'partner', 'other'],
      default: 'website',
    },
    lifecycleStatus: {
      type: String,
      enum: ['lead', 'prospect', 'customer', 'churned', 'inactive'],
      default: 'customer',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: {
      type: String,
      default: '',
    },
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast tenant search
customerSchema.index({ organizationId: 1, email: 1 });
customerSchema.index({ organizationId: 1, name: 'text', company: 'text', email: 'text' });

export const Customer = mongoose.model('Customer', customerSchema);
