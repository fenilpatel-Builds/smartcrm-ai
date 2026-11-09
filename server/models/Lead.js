import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Lead email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ['website', 'referral', 'cold_outreach', 'inbound', 'advertising', 'partner', 'other'],
      default: 'website',
    },
    stage: {
      type: String,
      enum: ['new_lead', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'converted', 'lost'],
      default: 'new_lead',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    estimatedValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    convertedCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    convertedAt: {
      type: Date,
    },
    lostReason: {
      type: String,
      default: '',
    },
    stageHistory: [
      {
        stage: {
          type: String,
          required: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ organizationId: 1, stage: 1 });

export const Lead = mongoose.model('Lead', leadSchema);
