import mongoose from 'mongoose';

const ticketMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    senderName: {
      type: String,
      default: '',
    },
    senderType: {
      type: String,
      enum: ['agent', 'customer', 'system'],
      default: 'agent',
    },
    content: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    ticketNumber: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'waiting', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    category: {
      type: String,
      enum: ['billing', 'technical', 'feature_request', 'onboarding', 'general'],
      default: 'general',
      index: true,
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    messages: [ticketMessageSchema],
  },
  {
    timestamps: true,
  }
);

supportTicketSchema.index({ organizationId: 1, status: 1 });
supportTicketSchema.index({ organizationId: 1, priority: 1 });
supportTicketSchema.index({ organizationId: 1, ticketNumber: 1 });

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
export default SupportTicket;
