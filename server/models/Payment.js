import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
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
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'bank_transfer', 'stripe', 'razorpay', 'paypal', 'cash', 'other'],
      default: 'credit_card',
    },
    transactionReference: {
      type: String,
      default: () => `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_paid'],
      default: 'paid',
      index: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ organizationId: 1, status: 1 });
paymentSchema.index({ organizationId: 1, paidAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
