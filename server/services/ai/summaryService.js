import { Customer } from '../../models/Customer.js';
import { Subscription } from '../../models/Subscription.js';
import { Payment } from '../../models/Payment.js';
import { Invoice } from '../../models/Invoice.js';
import { InteractionLog } from '../../models/InteractionLog.js';
import { AIInsight } from '../../models/AIInsight.js';
import { callAI } from './aiClient.js';

export const generateCustomerSummary = async (customerId, organizationId) => {
  const customer = await Customer.findOne({ _id: customerId, organizationId });
  if (!customer) throw new Error('Customer not found');

  const subscription = await Subscription.findOne({
    customerId,
    organizationId,
    status: { $in: ['active', 'trial', 'paused', 'past_due'] },
  }).populate('planId');

  const payments = await Payment.find({ customerId, organizationId, status: 'paid' });
  const totalSpend = payments.reduce((sum, p) => sum + p.amount, 0);

  const overdueInvoices = await Invoice.find({
    customerId,
    organizationId,
    dueDate: { $lt: new Date() },
    balanceDue: { $gt: 0 },
  });
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

  const interactions = await InteractionLog.find({ customerId, organizationId })
    .sort({ interactionDate: -1 })
    .limit(5);

  // Build baseline deterministic summary
  let summaryText = `${customer.name}${customer.company ? ` from ${customer.company}` : ''} joined via ${customer.source} on ${customer.createdAt.toISOString().split('T')[0]}. `;

  if (subscription) {
    summaryText += `Currently subscribed to the ${subscription.planId?.name || 'Standard'} plan ($${subscription.amount}/${subscription.billingFrequency}) in ${subscription.status} status. `;
  } else {
    summaryText += `Currently has no active subscription. `;
  }

  summaryText += `Lifetime revenue generated: $${totalSpend.toFixed(2)}. `;

  if (totalOverdue > 0) {
    summaryText += `ATTENTION: Account has $${totalOverdue.toFixed(2)} in overdue payments across ${overdueInvoices.length} invoice(s). `;
  } else {
    summaryText += `Payment standing is currently in good order. `;
  }

  if (interactions.length > 0) {
    const latest = interactions[0];
    summaryText += `Latest contact was a ${latest.interactionType} on ${new Date(latest.interactionDate).toLocaleDateString()} ("${latest.subject}").`;
  } else {
    summaryText += `No previous interactions logged with this customer.`;
  }

  // Next steps logic
  const nextSteps = [];
  if (totalOverdue > 0) {
    nextSteps.push('Send billing statement and follow up on outstanding balance');
  } else if (!subscription) {
    nextSteps.push('Engage sales pipeline to convert account to active subscription');
  } else if (interactions.length === 0) {
    nextSteps.push('Initiate customer welcome call or relationship check-in');
  } else {
    nextSteps.push('Maintain regular quarterly review cadence');
  }

  // Attempt LLM polish if available
  const aiPrompt = `Summarize customer profile for an account manager:
Data:
${summaryText}

Return a clean, polished executive summary (approx 3 sentences) highlighting relationship health and recommended action.`;

  const aiResult = await callAI({
    prompt: aiPrompt,
    systemPrompt: 'You are an executive SaaS relationship manager.',
    responseFormat: 'text',
  });

  const finalSummary = aiResult && typeof aiResult === 'string' && aiResult.trim() ? aiResult.trim() : summaryText;

  // Store in AIInsight
  await AIInsight.findOneAndUpdate(
    { organizationId, customerId, insightType: 'summary' },
    {
      summary: finalSummary,
      recommendations: nextSteps,
      modelProvider: aiResult ? 'hybrid-llm-engine' : 'smartcrm-summary-engine',
      generatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return {
    customerId,
    summary: finalSummary,
    metrics: {
      totalSpend,
      totalOverdue,
      subscriptionPlan: subscription?.planId?.name || 'None',
      status: customer.lifecycleStatus,
      interactionsCount: interactions.length,
    },
    recommendedNextSteps: nextSteps,
  };
};
