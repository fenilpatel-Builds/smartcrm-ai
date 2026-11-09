import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['renewal', 'overdue_payment', 'churn_alert', 'task_reminder', 'lead_activity', 'system'],
      default: 'system',
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedEntity: {
      entityType: {
        type: String,
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ organizationId: 1, userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
