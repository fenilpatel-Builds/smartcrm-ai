import mongoose from 'mongoose';

const interactionLogSchema = new mongoose.Schema(
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    interactionType: {
      type: String,
      enum: ['call', 'email', 'meeting', 'note', 'follow_up', 'support', 'status_change'],
      default: 'note',
      required: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    interactionDate: {
      type: Date,
      default: Date.now,
    },
    nextFollowUpDate: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

interactionLogSchema.index({ organizationId: 1, customerId: 1, interactionDate: -1 });

export const InteractionLog = mongoose.model('InteractionLog', interactionLogSchema);
