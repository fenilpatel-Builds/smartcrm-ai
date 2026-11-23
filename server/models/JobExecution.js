import mongoose from 'mongoose';

const jobExecutionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    jobName: {
      type: String,
      required: true,
      index: true,
    },
    queue: {
      type: String,
      default: 'default',
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'retrying'],
      default: 'pending',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    lastError: {
      type: String,
      default: '',
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lockedAt: {
      type: Date,
    },
    lockedBy: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

jobExecutionSchema.index({ status: 1, scheduledFor: 1 });
jobExecutionSchema.index({ jobName: 1, createdAt: -1 });

export const JobExecution = mongoose.model('JobExecution', jobExecutionSchema);
export default JobExecution;
