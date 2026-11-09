import mongoose from 'mongoose';
import { Customer } from '../../models/Customer.js';
import { Subscription } from '../../models/Subscription.js';
import { SubscriptionPlan } from '../../models/SubscriptionPlan.js';
import { Payment } from '../../models/Payment.js';
import { Invoice } from '../../models/Invoice.js';
import { AIInsight } from '../../models/AIInsight.js';
import { InteractionLog } from '../../models/InteractionLog.js';
import { calculateSubscriptionMRR } from '../subscription/subscriptionService.js';

export const getDashboardMetrics = async (organizationId) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);

  // 1. Total Customers & Active Customers
  const totalCustomers = await Customer.countDocuments({ organizationId: orgId, isDeleted: false });
  const activeCustomers = await Customer.countDocuments({
    organizationId: orgId,
    lifecycleStatus: 'customer',
    isDeleted: false,
  });

  // Calculate prior 30-day customers to compute growth %
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const customersCurrentPeriod = await Customer.countDocuments({
    organizationId: orgId,
    createdAt: { $gte: thirtyDaysAgo },
    isDeleted: false,
  });
  const customersPriorPeriod = await Customer.countDocuments({
    organizationId: orgId,
    createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
    isDeleted: false,
  });

  const customerGrowthPct =
    customersPriorPeriod > 0
      ? Number((((customersCurrentPeriod - customersPriorPeriod) / customersPriorPeriod) * 100).toFixed(1))
      : customersCurrentPeriod > 0
      ? 100
      : 0;

  // 2. Subscriptions & MRR / ARR
  const activeSubscriptions = await Subscription.find({
    organizationId: orgId,
    status: { $in: ['active', 'trial'] },
  }).populate('planId');

  const totalSubscriptionsCount = activeSubscriptions.length;

  let currentMRR = 0;
  activeSubscriptions.forEach((sub) => {
    currentMRR += calculateSubscriptionMRR(sub);
  });
  currentMRR = Math.round(currentMRR * 100) / 100;
  const currentARR = Math.round(currentMRR * 12 * 100) / 100;

  // 3. Pending Payments & Outstanding
  const pendingInvoices = await Invoice.find({
    organizationId: orgId,
    status: { $in: ['sent', 'partially_paid', 'overdue'] },
    balanceDue: { $gt: 0 },
  });

  const pendingPaymentsCount = pendingInvoices.length;
  const pendingPaymentsAmount = pendingInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

  // 4. Upcoming Renewals (next 30 days)
  const today = new Date();
  const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const upcomingRenewalsCount = await Subscription.countDocuments({
    organizationId: orgId,
    status: 'active',
    nextRenewalDate: { $gte: today, $lte: next30Days },
  });

  const upcomingRenewalsList = await Subscription.find({
    organizationId: orgId,
    status: 'active',
    nextRenewalDate: { $gte: today, $lte: next30Days },
  })
    .populate('customerId', 'name email company')
    .populate('planId', 'name')
    .sort({ nextRenewalDate: 1 })
    .limit(5);

  // 5. High-Risk Customers
  const highRiskInsights = await AIInsight.find({
    organizationId: orgId,
    riskLevel: 'High',
  })
    .populate('customerId', 'name email company lifecycleStatus')
    .sort({ riskScore: -1 })
    .limit(5);

  const highRiskCount = await AIInsight.countDocuments({
    organizationId: orgId,
    riskLevel: 'High',
  });

  // 6. Recent Interactions / Activity
  const recentActivities = await InteractionLog.find({ organizationId: orgId })
    .populate('customerId', 'name company')
    .populate('userId', 'name')
    .sort({ interactionDate: -1 })
    .limit(7);

  // 7. Monthly Revenue Trend (Last 6 Months from collected payments)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const monthlyPayments = await Payment.aggregate([
    {
      $match: {
        organizationId: orgId,
        status: 'paid',
        paidAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$paidAt' },
          month: { $month: '$paidAt' },
        },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const revenueTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    const match = monthlyPayments.find((p) => p._id.year === yr && p._id.month === mo);
    revenueTrend.push({
      month: `${monthNames[mo - 1]} ${yr}`,
      revenue: match ? Math.round(match.revenue) : 0,
      transactions: match ? match.count : 0,
    });
  }

  // 8. Subscription Distribution by Status
  const subStatusCounts = await Subscription.aggregate([
    { $match: { organizationId: orgId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const subscriptionDistribution = subStatusCounts.map((s) => ({
    name: s._id.charAt(0).toUpperCase() + s._id.slice(1).replace('_', ' '),
    value: s.count,
  }));

  // 9. Revenue by Subscription Plan
  const planRevenueAgg = await Subscription.aggregate([
    { $match: { organizationId: orgId, status: 'active' } },
    {
      $group: {
        _id: '$planId',
        activeSubs: { $sum: 1 },
        totalRawAmount: { $sum: '$amount' },
      },
    },
    {
      $lookup: {
        from: 'subscriptionplans',
        localField: '_id',
        foreignField: '_id',
        as: 'plan',
      },
    },
    { $unwind: '$plan' },
    {
      $project: {
        planName: '$plan.name',
        activeSubs: 1,
        monthlyPrice: '$plan.pricing.monthly',
        estimatedMRR: { $multiply: ['$activeSubs', '$plan.pricing.monthly'] },
      },
    },
  ]);

  // 10. Customer Lifecycle Distribution
  const lifecycleCounts = await Customer.aggregate([
    { $match: { organizationId: orgId, isDeleted: false } },
    { $group: { _id: '$lifecycleStatus', count: { $sum: 1 } } },
  ]);

  const customerLifecycle = lifecycleCounts.map((l) => ({
    status: l._id.charAt(0).toUpperCase() + l._id.slice(1),
    count: l.count,
  }));

  return {
    kpis: {
      totalCustomers: { value: totalCustomers, change: customerGrowthPct, isPositive: customerGrowthPct >= 0 },
      activeCustomers: { value: activeCustomers },
      totalSubscriptions: { value: totalSubscriptionsCount },
      mrr: { value: currentMRR, label: `$${currentMRR.toLocaleString()}` },
      arr: { value: currentARR, label: `$${currentARR.toLocaleString()}` },
      pendingPayments: { count: pendingPaymentsCount, amount: pendingPaymentsAmount },
      upcomingRenewals: { count: upcomingRenewalsCount },
      highRiskCustomers: { count: highRiskCount },
    },
    revenueTrend,
    subscriptionDistribution,
    planRevenue: planRevenueAgg,
    customerLifecycle,
    upcomingRenewalsList,
    highRiskInsights,
    recentActivities,
  };
};

export const getReportsData = async (organizationId, { startDate, endDate, reportType = 'all' }) => {
  const orgId = new mongoose.Types.ObjectId(organizationId);

  const queryFilter = { organizationId: orgId };
  if (startDate || endDate) {
    queryFilter.createdAt = {};
    if (startDate) queryFilter.createdAt.$gte = new Date(startDate);
    if (endDate) queryFilter.createdAt.$lte = new Date(endDate);
  }

  // 1. Customer Acquisition Report
  const customerAcquisitions = await Customer.find(queryFilter)
    .select('name email company source lifecycleStatus createdAt')
    .sort({ createdAt: -1 });

  // 2. Payments Collected
  const paymentFilter = { organizationId: orgId };
  if (startDate || endDate) {
    paymentFilter.paidAt = {};
    if (startDate) paymentFilter.paidAt.$gte = new Date(startDate);
    if (endDate) paymentFilter.paidAt.$lte = new Date(endDate);
  }
  const payments = await Payment.find(paymentFilter)
    .populate('customerId', 'name company email')
    .sort({ paidAt: -1 });

  const totalCollected = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  // 3. Subscriptions Growth & Status
  const subscriptions = await Subscription.find({ organizationId: orgId })
    .populate('customerId', 'name company email')
    .populate('planId', 'name pricing')
    .sort({ createdAt: -1 });

  // 4. Churn Analysis
  const churnedCustomers = await Customer.find({
    organizationId: orgId,
    lifecycleStatus: 'churned',
  }).select('name company email updatedAt');

  return {
    summary: {
      totalAcquired: customerAcquisitions.length,
      totalCollected,
      totalSubscriptions: subscriptions.length,
      totalChurned: churnedCustomers.length,
      churnRate: customerAcquisitions.length > 0
        ? Number(((churnedCustomers.length / (customerAcquisitions.length + churnedCustomers.length)) * 100).toFixed(1))
        : 0,
    },
    customerAcquisitions,
    payments,
    subscriptions,
    churnedCustomers,
  };
};
