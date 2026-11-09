import { AIInsight } from '../models/AIInsight.js';
import * as churnPredictionService from '../services/ai/churnPredictionService.js';
import * as upsellService from '../services/ai/upsellService.js';
import * as summaryService from '../services/ai/summaryService.js';
import * as messageGeneratorService from '../services/ai/messageGeneratorService.js';
import * as assistantService from '../services/ai/assistantService.js';

export const analyzeCustomerChurn = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const analysis = await churnPredictionService.analyzeChurnRisk(customerId, req.organizationId);

    res.json({
      success: true,
      message: 'Churn analysis generated successfully',
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerInsights = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const insights = await AIInsight.find({ customerId, organizationId: req.organizationId }).sort({ generatedAt: -1 });

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    next(error);
  }
};

export const getHighRiskCustomers = async (req, res, next) => {
  try {
    const highRisk = await AIInsight.find({
      organizationId: req.organizationId,
      riskLevel: { $in: ['High', 'Medium'] },
    })
      .populate('customerId', 'name email company phone lifecycleStatus')
      .sort({ riskScore: -1 });

    res.json({
      success: true,
      data: highRisk,
    });
  } catch (error) {
    next(error);
  }
};

export const getUpsellRecommendations = async (req, res, next) => {
  try {
    const { customerId } = req.query;
    if (customerId) {
      const recommendations = await upsellService.generateUpsellRecommendations(customerId, req.organizationId);
      return res.json({ success: true, data: recommendations });
    }

    const allUpsellInsights = await AIInsight.find({
      organizationId: req.organizationId,
      insightType: 'upsell',
    }).populate('customerId', 'name email company');

    res.json({
      success: true,
      data: allUpsellInsights,
    });
  } catch (error) {
    next(error);
  }
};

export const generateCustomerSummary = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const summary = await summaryService.generateCustomerSummary(customerId, req.organizationId);

    res.json({
      success: true,
      message: 'Customer summary synthesized successfully',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const generateMessage = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { messageType, tone, customInstructions, senderName } = req.body;

    const message = await messageGeneratorService.generateCustomerMessage({
      customerId,
      organizationId: req.organizationId,
      messageType,
      tone,
      customInstructions,
      senderName: senderName || req.user.name,
    });

    res.json({
      success: true,
      message: 'Outreach message drafted successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

export const queryAssistant = async (req, res, next) => {
  try {
    const { query } = req.body;
    const result = await assistantService.queryBusinessAssistant({
      query,
      organizationId: req.organizationId,
      user: req.user,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
