import mongoose from 'mongoose';
import { Customer } from '../../models/Customer.js';
import { Subscription } from '../../models/Subscription.js';
import { SubscriptionPlan } from '../../models/SubscriptionPlan.js';
import { Invoice } from '../../models/Invoice.js';
import { AIInsight } from '../../models/AIInsight.js';
import { Task } from '../../models/Task.js';
import { calculateSubscriptionMRR } from '../subscription/subscriptionService.js';
import { callAI } from './aiClient.js';

export const queryBusinessAssistant = async ({ query, organizationId, user }) => {
  if (!query || typeof query !== 'string') {
    throw new Error('A query prompt is required.');
  }

  const q = query.toLowerCase().trim();
  const orgId = new mongoose.Types.ObjectId(organizationId);

  let responseText = '';
  let relatedData = [];
  let category = 'general';

  // 1. MRR or ARR inquiry
  if (q.includes('mrr') || q.includes('arr') || q.includes('recurring revenue') || q.includes('how much revenue')) {
    category = 'revenue';
    const activeSubs = await Subscription.find({
      organizationId: orgId,
      status: { $in: ['active', 'trial'] },
    }).populate('planId');

    let mrr = 0;
    activeSubs.forEach((sub) => {
      mrr += calculateSubscriptionMRR(sub);
    });
    const arr = mrr * 12;

    responseText = `Your organization currently generates **$${mrr.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}** in Monthly Recurring Revenue (MRR), across **${activeSubs.length}** active subscription(s). This translates to an Annual Recurring Revenue (ARR) run rate of **$${arr.toLocaleString(
      undefined,
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}**.`;

    relatedData = activeSubs.map((s) => ({
      id: s._id,
      customerId: s.customerId,
      plan: s.planId?.name,
      amount: s.amount,
      frequency: s.billingFrequency,
    }));
  }

  // 2. High-risk customers or churn inquiry
  else if (q.includes('risk') || q.includes('churn') || q.includes('cancel')) {
    category = 'churn';
    const highRiskInsights = await AIInsight.find({
      organizationId: orgId,
      riskLevel: { $in: ['High', 'Medium'] },
    })
      .populate('customerId', 'name company email lifecycleStatus phone')
      .sort({ riskScore: -1 })
      .limit(10);

    const highCount = highRiskInsights.filter((i) => i.riskLevel === 'High').length;

    if (highRiskInsights.length === 0) {
      responseText = `Great news! Currently, there are no customers identified as high risk of churn in your workspace. All monitored accounts are in healthy standing.`;
    } else {
      responseText = `Found **${highRiskInsights.length}** customer(s) flagged with retention concerns (${highCount} classified as High Risk). Immediate retention outreach is recommended for these accounts.`;
      relatedData = highRiskInsights.map((i) => ({
        id: i.customerId?._id,
        name: i.customerId?.name,
        company: i.customerId?.company,
        riskScore: i.riskScore,
        riskLevel: i.riskLevel,
        primaryFactor: i.riskFactors?.[0] || 'No recent activity',
      }));
    }
  }

  // 3. Overdue payments or invoices inquiry
  else if (q.includes('overdue') || q.includes('unpaid') || q.includes('pending payment') || q.includes('owe')) {
    category = 'payments';
    const overdueInvoices = await Invoice.find({
      organizationId: orgId,
      dueDate: { $lt: new Date() },
      status: { $in: ['sent', 'partially_paid', 'overdue'] },
      balanceDue: { $gt: 0 },
    }).populate('customerId', 'name company email');

    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

    if (overdueInvoices.length === 0) {
      responseText = `There are currently no overdue payments in your system. All active customer invoices are completely settled.`;
    } else {
      responseText = `There are currently **${overdueInvoices.length}** overdue invoice(s) totaling **$${totalOverdue.toLocaleString(
        undefined,
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      )}**.`;
      relatedData = overdueInvoices.map((inv) => ({
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerId?.name,
        company: inv.customerId?.company,
        balanceDue: inv.balanceDue,
        dueDate: inv.dueDate,
      }));
    }
  }

  // 4. Subscriptions expiring soon or renewals
  else if (q.includes('expire') || q.includes('renewal') || q.includes('renew')) {
    category = 'renewals';
    const now = new Date();
    const next14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const renewals = await Subscription.find({
      organizationId: orgId,
      status: 'active',
      nextRenewalDate: { $gte: now, $lte: next14Days },
    })
      .populate('customerId', 'name company email')
      .populate('planId', 'name')
      .sort({ nextRenewalDate: 1 });

    if (renewals.length === 0) {
      responseText = `No subscriptions are due for renewal in the next 14 days.`;
    } else {
      responseText = `There are **${renewals.length}** subscription renewal(s) coming up within the next 14 days.`;
      relatedData = renewals.map((r) => ({
        id: r._id,
        customerName: r.customerId?.name,
        company: r.customerId?.company,
        plan: r.planId?.name,
        amount: r.amount,
        renewalDate: r.nextRenewalDate,
      }));
    }
  }

  // 5. Highest revenue plans
  else if (q.includes('plan') || q.includes('highest revenue') || q.includes('popular')) {
    category = 'plans';
    const planBreakdown = await Subscription.aggregate([
      { $match: { organizationId: orgId, status: 'active' } },
      { $group: { _id: '$planId', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      { $lookup: { from: 'subscriptionplans', localField: '_id', foreignField: '_id', as: 'plan' } },
      { $unwind: '$plan' },
      { $sort: { totalAmount: -1 } },
    ]);

    if (planBreakdown.length === 0) {
      responseText = `No active subscription plans are currently assigned to customers.`;
    } else {
      const top = planBreakdown[0];
      responseText = `Your highest revenue subscription plan is **${top.plan.name}**, with **${
        top.count
      }** active subscriber(s) generating **$${top.totalAmount.toLocaleString()}** in volume.`;
      relatedData = planBreakdown.map((p) => ({
        name: p.plan.name,
        subscribers: p.count,
        revenue: p.totalAmount,
      }));
    }
  }

  // 6. Who should we contact today / tasks
  else if (q.includes('contact today') || q.includes('who should') || q.includes('task') || q.includes('follow up')) {
    category = 'tasks';
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const pendingTasks = await Task.find({
      organizationId: orgId,
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $lte: endOfDay },
    })
      .populate('customerId', 'name company phone email')
      .populate('assignedTo', 'name')
      .sort({ priority: -1, dueDate: 1 });

    if (pendingTasks.length === 0) {
      responseText = `You have no urgent follow-up tasks due today. All scheduled outreach items are on track.`;
    } else {
      responseText = `You have **${pendingTasks.length}** follow-up task(s) requiring attention today.`;
      relatedData = pendingTasks.map((t) => ({
        id: t._id,
        title: t.title,
        customer: t.customerId?.name || 'General',
        company: t.customerId?.company,
        priority: t.priority,
        assignedTo: t.assignedTo?.name || 'Unassigned',
      }));
    }
  }

  // Fallback for general queries
  else {
    const totalCust = await Customer.countDocuments({ organizationId: orgId, isDeleted: false });
    const totalSubs = await Subscription.countDocuments({ organizationId: orgId, status: 'active' });

    responseText = `I analyzed your workspace: You have **${totalCust}** total customers and **${totalSubs}** active subscriptions. You can ask me about **MRR**, **churn risk**, **overdue payments**, **upcoming renewals**, or **tasks due today**.`;
  }

  // Attempt natural language summarization with LLM if available
  const aiPrompt = `User question: "${query}"
Factual CRM Data retrieved:
${responseText}
Data Items: ${JSON.stringify(relatedData.slice(0, 5))}

Provide a direct, conversational executive response (2-3 sentences max) answering the question based ONLY on the factual CRM data provided above.`;

  const refined = await callAI({
    prompt: aiPrompt,
    systemPrompt: 'You are the SmartCRM Executive AI Assistant. Keep answers direct, grounded in facts, concise and professional.',
    responseFormat: 'text',
  });

  return {
    query,
    category,
    answer: refined && typeof refined === 'string' && refined.trim() ? refined.trim() : responseText,
    data: relatedData,
    timestamp: new Date(),
  };
};
