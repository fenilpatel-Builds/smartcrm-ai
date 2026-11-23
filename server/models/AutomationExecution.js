import mongoose from 'mongoose';

const automationExecutionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutomationRule',
      required: true,
      index: true,
    },
    triggerEvent: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      default: '',
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'partial'],
      default: 'success',
      index: true,
    },
    logs: [
      {
        type: String,
      },
    ],
    error: {
      type: String,
      default: '',
    },
    executedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

automationExecutionSchema.index({ organizationId: 1, executedAt: -1 });

export const AutomationExecution = mongoose.model('AutomationExecution', automationExecutionSchema);
export default AutomationExecution;
