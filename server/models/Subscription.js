import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
      index: true,
    },
    billingFrequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'semi_annual', 'annual'],
      default: 'monthly',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Subscription amount is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    currentPeriodStart: {
      type: Date,
      required: true,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    nextRenewalDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['trial', 'active', 'past_due', 'paused', 'cancelled', 'expired'],
      default: 'active',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'failed'],
      default: 'paid',
      index: true,
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
      default: '',
    },
    pausedAt: {
      type: Date,
    },
    pauseReason: {
      type: String,
      default: '',
    },
    history: [
      {
        action: String,
        fromStatus: String,
        toStatus: String,
        fromPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
        toPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
        changedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ organizationId: 1, status: 1 });
subscriptionSchema.index({ organizationId: 1, nextRenewalDate: 1 });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
