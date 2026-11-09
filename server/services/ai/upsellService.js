import { Customer } from '../../models/Customer.js';
import { Subscription } from '../../models/Subscription.js';
import { SubscriptionPlan } from '../../models/SubscriptionPlan.js';
import { Invoice } from '../../models/Invoice.js';
import { AIInsight } from '../../models/AIInsight.js';
import { callAI } from './aiClient.js';

export const generateUpsellRecommendations = async (customerId, organizationId) => {
  const customer = await Customer.findOne({ _id: customerId, organizationId });
  if (!customer) throw new Error('Customer not found');

  const currentSub = await Subscription.findOne({
    customerId,
    organizationId,
    status: 'active',
  }).populate('planId');

  const allPlans = await SubscriptionPlan.find({ organizationId, isActive: true }).sort({ 'pricing.monthly': 1 });

  const overdueInvoices = await Invoice.countDocuments({
    customerId,
    organizationId,
    dueDate: { $lt: new Date() },
    balanceDue: { $gt: 0 },
  });

  const upsellOptions = [];

  if (currentSub && currentSub.planId) {
    const currentPrice = currentSub.amount;
    const currentFrequency = currentSub.billingFrequency;

    // Find plans with higher pricing
    const higherPlans = allPlans.filter((p) => {
      const pPrice = currentFrequency === 'annual' ? p.pricing.annual : p.pricing.monthly;
      return pPrice > currentPrice;
    });

    for (const targetPlan of higherPlans) {
      const targetPrice = currentFrequency === 'annual' ? targetPlan.pricing.annual : targetPlan.pricing.monthly;
      const additionalRevenue = Math.max(0, targetPrice - currentPrice);

      let priority = 'Medium';
      let suggestedTiming = 'At upcoming renewal window';

      if (overdueInvoices > 0) {
        priority = 'Low';
        suggestedTiming = 'After resolving pending account balances';
      } else {
        const tenureMonths = Math.floor((new Date() - new Date(currentSub.startDate)) / (1000 * 60 * 60 * 24 * 30));
        if (tenureMonths >= 3) {
          priority = 'High';
          suggestedTiming = 'Immediate mid-cycle or upcoming renewal';
        }
      }

      upsellOptions.push({
        recommendedPlan: targetPlan.name,
        targetPlanId: targetPlan._id,
        currentPlan: currentSub.planId.name,
        reason: `Upgrading to ${targetPlan.name} unlocks advanced team collaboration and enterprise capabilities (${targetPlan.features?.slice(0, 2).join(', ') || 'enhanced limits'}).`,
        potentialAdditionalRevenue: additionalRevenue,
        suggestedTiming,
        priority,
        communicationPitch: `Highlight how ${targetPlan.name}'s features align with ${customer.company || customer.name}'s ongoing business expansion.`,
      });
    }
  } else if (!currentSub) {
    // Lead or prospect: recommend starting on starter or professional plan
    const starterPlan = allPlans[0];
    if (starterPlan) {
      upsellOptions.push({
        recommendedPlan: starterPlan.name,
        targetPlanId: starterPlan._id,
        currentPlan: 'None',
        reason: 'Customer has no active subscription. Propose initial onboarding plan.',
        potentialAdditionalRevenue: starterPlan.pricing.monthly,
        suggestedTiming: 'Immediate sales follow-up',
        priority: 'High',
        communicationPitch: `Present ${starterPlan.name} as the fastest pathway to value.`,
      });
    }
  }

  // AI enrichment if LLM is active
  if (upsellOptions.length > 0) {
    const aiPrompt = `Review upsell opportunity for CRM customer ${customer.name} (${customer.company}):
Current Subscription: ${currentSub ? currentSub.planId.name : 'None'}
Proposed Plan: ${upsellOptions[0].recommendedPlan}
Additional Revenue: $${upsellOptions[0].potentialAdditionalRevenue}
Priority: ${upsellOptions[0].priority}

Return JSON with:
- refinedReason: one sentence value proposition
- refinedPitch: one sentence executive outreach pitch`;

    const aiRes = await callAI({
      prompt: aiPrompt,
      systemPrompt: 'You are an enterprise SaaS Expansion and Upsell Specialist.',
      responseFormat: 'json',
    });

    if (aiRes?.refinedReason) {
      upsellOptions[0].reason = aiRes.refinedReason;
    }
    if (aiRes?.refinedPitch) {
      upsellOptions[0].communicationPitch = aiRes.refinedPitch;
    }
  }

  // Update AIInsight
  await AIInsight.findOneAndUpdate(
    { organizationId, customerId, insightType: 'upsell' },
    {
      upsellOptions,
      modelProvider: 'smartcrm-expansion-engine',
      modelVersion: '1.0',
      generatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return {
    customerId,
    upsellOptions,
  };
};
