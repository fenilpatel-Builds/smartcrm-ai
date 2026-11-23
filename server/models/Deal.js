import mongoose from 'mongoose';

const stageHistorySchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      required: true,
    },
    enteredAt: {
      type: Date,
      default: Date.now,
    },
    exitedAt: {
      type: Date,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
);

const dealSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Deal title is required'],
      trim: true,
      index: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    pipelineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pipeline',
      index: true,
    },
    stage: {
      type: String,
      enum: ['discovery', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
      default: 'discovery',
      index: true,
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 10,
    },
    expectedCloseDate: {
      type: Date,
    },
    actualCloseDate: {
      type: Date,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    lostReason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    stageHistory: [stageHistorySchema],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

dealSchema.virtual('weightedValue').get(function () {
  return Math.round((this.value * (this.probability || 0)) / 100);
});

dealSchema.index({ organizationId: 1, stage: 1 });
dealSchema.index({ organizationId: 1, expectedCloseDate: 1 });
dealSchema.index({ organizationId: 1, title: 'text' });

export const Deal = mongoose.model('Deal', dealSchema);
export default Deal;
