import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
    },
    industry: {
      type: String,
      trim: true,
      default: 'Technology',
    },
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
      default: '11-50',
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
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
    annualRevenue: {
      type: Number,
      default: 0,
      min: 0,
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

companySchema.index({ organizationId: 1, name: 1 });
companySchema.index({ organizationId: 1, domain: 1 });
companySchema.index({ organizationId: 1, name: 'text', industry: 'text', domain: 'text' });

export const Company = mongoose.model('Company', companySchema);
export default Company;
