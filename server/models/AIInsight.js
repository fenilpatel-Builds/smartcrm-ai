import mongoose from 'mongoose';

const aiInsightSchema = new mongoose.Schema(
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
    insightType: {
      type: String,
      enum: ['churn_analysis', 'upsell', 'summary', 'communication', 'comprehensive'],
      default: 'comprehensive',
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low',
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    riskFactors: [
      {
        type: String,
      },
    ],
    recommendations: [
      {
        type: String,
      },
    ],
    upsellOptions: [
      {
        recommendedPlan: String,
        reason: String,
        potentialAdditionalRevenue: Number,
        priority: String,
        suggestedTiming: String,
      },
    ],
    summary: {
      type: String,
      default: '',
    },
    explanation: {
      type: String,
      default: '',
    },
    modelProvider: {
      type: String,
      default: 'smartcrm-engine',
    },
    modelVersion: {
      type: String,
      default: '1.0',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

aiInsightSchema.index({ organizationId: 1, customerId: 1, generatedAt: -1 });

export const AIInsight = mongoose.model('AIInsight', aiInsightSchema);
