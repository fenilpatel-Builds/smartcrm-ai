import { Customer } from '../../models/Customer.js';
import { Subscription } from '../../models/Subscription.js';
import { Invoice } from '../../models/Invoice.js';
import { InteractionLog } from '../../models/InteractionLog.js';
import { AIInsight } from '../../models/AIInsight.js';
import { callAI } from './aiClient.js';

/**
 * Analyzes customer churn risk using transparent heuristics combined with AI explanations
 */
export const analyzeChurnRisk = async (customerId, organizationId) => {
  const customer = await Customer.findOne({ _id: customerId, organizationId });
  if (!customer) throw new Error('Customer not found');

  // Fetch relevant operational context
  const subscriptions = await Subscription.find({ customerId, organizationId }).populate('planId');
  const invoices = await Invoice.find({ customerId, organizationId });
  const interactions = await InteractionLog.find({ customerId, organizationId }).sort({ interactionDate: -1 });

  // 1. Calculate overdue balance and unpaid invoices
  const now = new Date();
  const overdueInvoices = invoices.filter(
    (inv) => inv.dueDate < now && ['sent', 'partially_paid', 'overdue'].includes(inv.status) && inv.balanceDue > 0
  );
  const totalOverdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

  // 2. Interaction frequency analysis
  const latestInteraction = interactions[0];
  const daysSinceLastInteraction = latestInteraction
    ? Math.floor((now - new Date(latestInteraction.interactionDate)) / (1000 * 60 * 60 * 24))
    : 999;

  // 3. Subscription status
  const activeSub = subscriptions.find((s) => s.status === 'active' || s.status === 'trial');
  const pastDueSub = subscriptions.find((s) => s.status === 'past_due');
  const pausedSub = subscriptions.find((s) => s.status === 'paused');
  const cancelledSub = subscriptions.find((s) => s.status === 'cancelled');

  let daysUntilRenewal = 999;
  if (activeSub && activeSub.nextRenewalDate) {
    daysUntilRenewal = Math.ceil((new Date(activeSub.nextRenewalDate) - now) / (1000 * 60 * 60 * 24));
  }

  // --- Transparent Heuristic Scoring Engine ---
  let score = 10; // Baseline low risk
  const riskFactors = [];
  const recommendedActions = [];

  // Overdue payment evaluation
  if (overdueInvoices.length > 0) {
    const penalty = Math.min(35, overdueInvoices.length * 15);
    score += penalty;
    riskFactors.push(`${overdueInvoices.length} overdue invoice(s) totaling $${totalOverdueAmount.toFixed(2)}`);
    recommendedActions.push('Send gentle payment reminder and offer account reconciliation');
  }

  // Past due subscription status
  if (pastDueSub) {
    score += 25;
    riskFactors.push('Subscription is in past-due status due to billing issue');
    recommendedActions.push('Review payment method and resolve gateway billing failure');
  }

  // Paused subscription
  if (pausedSub) {
    score += 20;
    riskFactors.push('Customer has placed their subscription on pause');
    recommendedActions.push('Reach out to understand reason for pause and address obstacles');
  }

  // Already cancelled
  if (customer.lifecycleStatus === 'churned' || (cancelledSub && !activeSub)) {
    score = 95;
    riskFactors.push('Account has cancelled recurring subscription');
    recommendedActions.push('Conduct win-back exit interview and understand core pain points');
  }

  // Engagement / Communication frequency
  if (daysSinceLastInteraction > 60) {
    score += 30;
    riskFactors.push(`Zero team interactions logged in the last ${daysSinceLastInteraction} days`);
    recommendedActions.push('Schedule proactive customer check-in or executive review');
  } else if (daysSinceLastInteraction > 30) {
    score += 15;
    riskFactors.push(`No interactions logged for ${daysSinceLastInteraction} days`);
    recommendedActions.push('Send customer satisfaction pulse check or feature update email');
  } else if (daysSinceLastInteraction <= 7) {
    score = Math.max(5, score - 15); // Reward recent contact
  }

  // Proximity to renewal without recent interaction
  if (daysUntilRenewal >= 0 && daysUntilRenewal <= 14 && daysSinceLastInteraction > 21) {
    score += 15;
    riskFactors.push(`Renewal approaching in ${daysUntilRenewal} days with no recent touchpoint`);
    recommendedActions.push('Arrange pre-renewal alignment call to secure renewal terms');
  }

  // Bound score strictly between 0 and 100
  score = Math.min(100, Math.max(0, Math.round(score)));

  let riskLevel = 'Low';
  if (score >= 66) riskLevel = 'High';
  else if (score >= 36) riskLevel = 'Medium';

  if (riskFactors.length === 0) {
    riskFactors.push('Consistent payment history and regular account touchpoints');
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push('Continue standard customer success cadence and monitor usage satisfaction');
  }

  let explanation = `Customer demonstrates ${riskLevel.toLowerCase()} churn risk with a calculated risk score of ${score}/100. Key drivers include ${riskFactors.slice(0, 2).join(' and ')}.`;

  // Follow-up date recommendation
  const followUpDays = riskLevel === 'High' ? 2 : riskLevel === 'Medium' ? 7 : 30;
  const suggestedFollowUpDate = new Date(Date.now() + followUpDays * 24 * 60 * 60 * 1000);

  // Attempt AI Enrichment if API available
  const aiPrompt = `Analyze customer churn context for CRM:
Customer: ${customer.name} (${customer.company || 'Individual'})
Status: ${customer.lifecycleStatus}
Risk Score: ${score}/100 (${riskLevel})
Risk Factors: ${riskFactors.join('; ')}
Overdue: $${totalOverdueAmount}
Days since interaction: ${daysSinceLastInteraction}

Return JSON with keys:
- explanation: concise 2-sentence executive summary
- recommendedActions: array of 3 specific actionable retention steps`;

  const aiResult = await callAI({
    prompt: aiPrompt,
    systemPrompt: 'You are an enterprise SaaS Customer Retention Analyst. Provide concise, realistic advice in JSON format.',
    responseFormat: 'json',
  });

  if (aiResult?.explanation) {
    explanation = aiResult.explanation;
  }
  if (Array.isArray(aiResult?.recommendedActions) && aiResult.recommendedActions.length > 0) {
    aiResult.recommendedActions.forEach((action) => {
      if (!recommendedActions.includes(action)) recommendedActions.push(action);
    });
  }

  // Save or update AIInsight in database
  const insight = await AIInsight.findOneAndUpdate(
    { organizationId, customerId, insightType: 'churn_analysis' },
    {
      riskLevel,
      riskScore: score,
      riskFactors,
      recommendations: recommendedActions,
      explanation,
      modelProvider: aiResult ? 'hybrid-llm-engine' : 'transparent-heuristic-engine',
      modelVersion: '1.0',
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days freshness
    },
    { upsert: true, new: true }
  );

  return {
    customerId: customer._id,
    riskLevel,
    riskScore: score,
    riskFactors,
    explanation,
    recommendedActions,
    suggestedFollowUpDate,
    modelProvider: insight.modelProvider,
    generatedAt: insight.generatedAt,
  };
};
