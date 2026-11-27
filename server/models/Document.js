import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['Contract', 'Proposal', 'Invoice', 'NDA', 'Report', 'Other'],
      default: 'Other',
      index: true,
    },
    relatedEntityType: {
      type: String,
      enum: ['customer', 'company', 'deal', 'subscription', 'lead', 'general'],
      default: 'general',
      index: true,
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isEncrypted: {
      type: Boolean,
      default: true,
    },
    eSignature: {
      required: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ['not_required', 'pending', 'signed', 'declined'],
        default: 'not_required',
      },
      signerEmail: { type: String, trim: true },
      signerName: { type: String, trim: true },
      signatureToken: { type: String, index: true },
      signatureHash: { type: String },
      signedAt: { type: Date },
      ipAddress: { type: String },
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ organizationId: 1, relatedEntityType: 1, relatedEntityId: 1 });
documentSchema.index({ organizationId: 1, category: 1 });

export const Document = mongoose.model('Document', documentSchema);
export default Document;
