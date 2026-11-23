import mongoose from 'mongoose';

const pipelineStageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    stageKey: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    probability: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 10,
    },
    color: {
      type: String,
      default: '#3b82f6',
    },
  },
  { _id: false }
);

const pipelineSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'Standard Sales Pipeline',
    },
    isDefault: {
      type: Boolean,
      default: true,
    },
    stages: {
      type: [pipelineStageSchema],
      default: [
        { name: 'Discovery', stageKey: 'discovery', order: 0, probability: 10, color: '#94a3b8' },
        { name: 'Qualification', stageKey: 'qualified', order: 1, probability: 25, color: '#38bdf8' },
        { name: 'Proposal Sent', stageKey: 'proposal', order: 2, probability: 50, color: '#818cf8' },
        { name: 'Negotiation', stageKey: 'negotiation', order: 3, probability: 75, color: '#f59e0b' },
        { name: 'Closed Won', stageKey: 'closed_won', order: 4, probability: 100, color: '#10b981' },
        { name: 'Closed Lost', stageKey: 'closed_lost', order: 5, probability: 0, color: '#ef4444' },
      ],
    },
  },
  {
    timestamps: true,
  }
);

pipelineSchema.index({ organizationId: 1, isDefault: 1 });

export const Pipeline = mongoose.model('Pipeline', pipelineSchema);
export default Pipeline;
