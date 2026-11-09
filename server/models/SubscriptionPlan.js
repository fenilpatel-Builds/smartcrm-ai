import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    pricing: {
      monthly: {
        type: Number,
        required: [true, 'Monthly price is required'],
        min: 0,
      },
      quarterly: {
        type: Number,
        min: 0,
      },
      semiAnnual: {
        type: Number,
        min: 0,
      },
      annual: {
        type: Number,
        required: [true, 'Annual price is required'],
        min: 0,
      },
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionPlanSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
