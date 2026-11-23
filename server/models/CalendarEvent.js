import mongoose from 'mongoose';

const attendeeSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const calendarEventSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    eventType: {
      type: String,
      enum: ['meeting', 'call', 'demo', 'task_deadline', 'renewal', 'follow_up'],
      default: 'meeting',
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    allDay: {
      type: Boolean,
      default: false,
    },
    location: {
      type: String,
      default: '',
    },
    meetUrl: {
      type: String,
      default: '',
    },
    relatedEntityType: {
      type: String,
      enum: ['customer', 'lead', 'deal', 'contact', 'company', 'none'],
      default: 'none',
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    attendees: [attendeeSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

calendarEventSchema.index({ organizationId: 1, startDate: 1 });
calendarEventSchema.index({ organizationId: 1, createdBy: 1 });

export const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
export default CalendarEvent;
