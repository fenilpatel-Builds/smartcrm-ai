import mongoose from 'mongoose';

const conditionSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in'],
      default: 'equals',
    },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const actionSchema = new mongoose.Schema(
  {
    actionType: {
      type: String,
      enum: ['send_email', 'create_task', 'update_status', 'assign_rep', 'send_notification', 'trigger_webhook'],
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const automationRuleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Rule name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    triggerType: {
      type: String,
      enum: [
        'lead_created',
        'lead_stage_changed',
        'deal_created',
        'deal_stage_changed',
        'deal_won',
        'subscription_created',
        'subscription_cancelled',
        'subscription_expiring',
        'ticket_created',
        'payment_failed',
      ],
      required: true,
      index: true,
    },
    conditions: [conditionSchema],
    actions: [actionSchema],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastTriggeredAt: {
      type: Date,
    },
    executionCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

automationRuleSchema.index({ organizationId: 1, triggerType: 1, isActive: 1 });

export const AutomationRule = mongoose.model('AutomationRule', automationRuleSchema);
export default AutomationRule;
