import { Subscription } from '../../models/Subscription.js';
import { SubscriptionPlan } from '../../models/SubscriptionPlan.js';
import { Customer } from '../../models/Customer.js';
import { logAudit } from '../audit/auditService.js';

export const roundMoney = (num) => Math.round(Number(num) * 100) / 100;

export const ALLOWED_TRANSITIONS = {
  pending: ['active', 'cancelled'],
  trial: ['active', 'cancelled', 'expired'],
  active: ['past_due', 'paused', 'cancelled', 'expired'],
  past_due: ['active', 'cancelled', 'expired'],
  paused: ['active', 'cancelled'],
  expired: ['active', 'cancelled'],
  cancelled: [], // Terminal state
};

/**
 * Validates if a state transition is legal in the subscription lifecycle
 */
export const validateTransition = (currentStatus, targetStatus) => {
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new Error(`Invalid subscription state transition from '${currentStatus}' to '${targetStatus}'.`);
  }
  return true;
};

/**
 * Calculates normalized Monthly Recurring Revenue (MRR) for a single subscription
 */
export const calculateSubscriptionMRR = (subscription) => {
  if (!subscription || subscription.status !== 'active') {
    return 0;
  }

  const { amount, billingFrequency } = subscription;
  switch (billingFrequency) {
    case 'monthly':
      return roundMoney(amount);
    case 'quarterly':
      return roundMoney(amount / 3);
    case 'semi_annual':
      return roundMoney(amount / 6);
    case 'annual':
      return roundMoney(amount / 12);
    default:
      return roundMoney(amount);
  }
};

/**
 * Calculates normalized Annual Recurring Revenue (ARR) for a single subscription
 */
export const calculateSubscriptionARR = (subscription) => {
  return roundMoney(calculateSubscriptionMRR(subscription) * 12);
};

/**
 * Calculates Average Revenue Per User (ARPU)
 */
export const calculateARPU = (totalMRR, activeCustomersCount) => {
  if (!activeCustomersCount || activeCustomersCount <= 0) return 0;
  return roundMoney(totalMRR / activeCustomersCount);
};

/**
 * Calculates Customer Lifetime Value (LTV)
 */
export const calculateLTV = (arpu, churnRatePercent) => {
  if (!arpu || arpu <= 0) return 0;
  if (!churnRatePercent || churnRatePercent <= 0) {
    return roundMoney(arpu * 24); // Default 24-month horizon when churn is zero
  }
  const monthlyChurnRate = (churnRatePercent / 100);
  return roundMoney(arpu / monthlyChurnRate);
};

/**
 * Calculates Churn Rate %
 */
export const calculateChurnRate = (churnedCustomersCount, totalCustomersCount) => {
  if (!totalCustomersCount || totalCustomersCount <= 0) return 0;
  return roundMoney((churnedCustomersCount / totalCustomersCount) * 100);
};

/**
 * Transitions a subscription to a new target status while enforcing the state machine
 */
export const transitionSubscriptionStatus = async ({
  organizationId,
  subscriptionId,
  targetStatus,
  reason,
  userId,
}) => {
  const subscription = await Subscription.findOne({ _id: subscriptionId, organizationId });
  if (!subscription) throw new Error('Subscription not found.');

  validateTransition(subscription.status, targetStatus);

  const prevStatus = subscription.status;
  subscription.status = targetStatus;

  if (targetStatus === 'cancelled') {
    subscription.cancelledAt = new Date();
    subscription.cancelReason = reason || 'Subscription cancelled';
  } else if (targetStatus === 'paused') {
    subscription.pausedAt = new Date();
    subscription.pauseReason = reason || 'Subscription paused';
  }

  subscription.history.push({
    action: `transitioned_to_${targetStatus}`,
    fromStatus: prevStatus,
    toStatus: targetStatus,
    reason: reason || `Transition from ${prevStatus} to ${targetStatus}`,
    changedAt: new Date(),
  });

  await subscription.save();

  await logAudit({
    organizationId,
    userId,
    action: `SUBSCRIPTION_TRANSITION_${targetStatus.toUpperCase()}`,
    entityType: 'Subscription',
    entityId: subscription._id,
    metadata: { fromStatus: prevStatus, toStatus: targetStatus, reason },
  });

  return subscription;
};

/**
 * Creates a new customer subscription
 */
export const createSubscription = async ({
  organizationId,
  customerId,
  planId,
  billingFrequency = 'monthly',
  customAmount,
  startDate = new Date(),
  userId,
}) => {
  const plan = await SubscriptionPlan.findOne({ _id: planId, organizationId });
  if (!plan) {
    throw new Error('Subscription plan not found or inactive.');
  }

  // Determine amount: if customAmount provided use it, otherwise use plan pricing
  let amount = customAmount;
  if (amount === undefined || amount === null) {
    switch (billingFrequency) {
      case 'monthly':
        amount = plan.pricing.monthly;
        break;
      case 'quarterly':
        amount = plan.pricing.quarterly || plan.pricing.monthly * 3;
        break;
      case 'semi_annual':
        amount = plan.pricing.semiAnnual || plan.pricing.monthly * 6;
        break;
      case 'annual':
        amount = plan.pricing.annual;
        break;
      default:
        amount = plan.pricing.monthly;
    }
  }

  const start = new Date(startDate);
  const end = new Date(start);

  if (plan.trialDays && plan.trialDays > 0) {
    end.setDate(end.getDate() + plan.trialDays);
  } else {
    switch (billingFrequency) {
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'quarterly':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'semi_annual':
        end.setMonth(end.getMonth() + 6);
        break;
      case 'annual':
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        end.setMonth(end.getMonth() + 1);
    }
  }

  const initialStatus = plan.trialDays > 0 ? 'trial' : 'active';

  const subscription = await Subscription.create({
    organizationId,
    customerId,
    planId,
    billingFrequency,
    amount,
    currency: plan.currency || 'USD',
    startDate: start,
    currentPeriodStart: start,
    currentPeriodEnd: end,
    nextRenewalDate: end,
    status: initialStatus,
    paymentStatus: 'paid',
    history: [
      {
        action: 'created',
        toStatus: initialStatus,
        toPlan: planId,
        reason: 'Subscription initiated',
        changedAt: new Date(),
      },
    ],
  });

  // Update customer lifecycle status to customer if not already
  await Customer.updateOne(
    { _id: customerId, organizationId },
    { $set: { lifecycleStatus: 'customer' } }
  );

  await logAudit({
    organizationId,
    userId,
    action: 'CREATE_SUBSCRIPTION',
    entityType: 'Subscription',
    entityId: subscription._id,
    metadata: { customerId, planName: plan.name, amount, billingFrequency },
  });

  return subscription;
};

/**
 * Pauses an active subscription
 */
export const pauseSubscription = async ({ organizationId, subscriptionId, reason, userId }) => {
  const subscription = await Subscription.findOne({ _id: subscriptionId, organizationId });
  if (!subscription) throw new Error('Subscription not found.');

  if (subscription.status !== 'active') {
    throw new Error(`Cannot pause a subscription with status '${subscription.status}'.`);
  }

  subscription.status = 'paused';
  subscription.pausedAt = new Date();
  subscription.pauseReason = reason || 'Customer requested temporary pause';
  subscription.history.push({
    action: 'paused',
    fromStatus: 'active',
    toStatus: 'paused',
    reason: subscription.pauseReason,
    changedAt: new Date(),
  });

  await subscription.save();

  await logAudit({
    organizationId,
    userId,
    action: 'PAUSE_SUBSCRIPTION',
    entityType: 'Subscription',
    entityId: subscription._id,
    metadata: { reason },
  });

  return subscription;
};

/**
 * Resumes a paused subscription
 */
export const resumeSubscription = async ({ organizationId, subscriptionId, userId }) => {
  const subscription = await Subscription.findOne({ _id: subscriptionId, organizationId });
  if (!subscription) throw new Error('Subscription not found.');

  if (subscription.status !== 'paused') {
    throw new Error(`Cannot resume a subscription with status '${subscription.status}'.`);
  }

  subscription.status = 'active';
  subscription.pausedAt = undefined;
  subscription.pauseReason = '';
  subscription.history.push({
    action: 'resumed',
    fromStatus: 'paused',
    toStatus: 'active',
    reason: 'Subscription resumed',
    changedAt: new Date(),
  });

  await subscription.save();

  await logAudit({
    organizationId,
    userId,
    action: 'RESUME_SUBSCRIPTION',
    entityType: 'Subscription',
    entityId: subscription._id,
  });

  return subscription;
};

/**
 * Cancels a subscription
 */
export const cancelSubscription = async ({ organizationId, subscriptionId, reason, userId }) => {
  const subscription = await Subscription.findOne({ _id: subscriptionId, organizationId });
  if (!subscription) throw new Error('Subscription not found.');

  if (subscription.status === 'cancelled') {
    throw new Error('Subscription is already cancelled.');
  }

  const previousStatus = subscription.status;
  subscription.status = 'cancelled';
  subscription.cancelledAt = new Date();
  subscription.cancelReason = reason || 'Customer requested cancellation';
  subscription.history.push({
    action: 'cancelled',
    fromStatus: previousStatus,
    toStatus: 'cancelled',
    reason: subscription.cancelReason,
    changedAt: new Date(),
  });

  await subscription.save();

  // Check if customer has any other active subscriptions
  const otherActive = await Subscription.findOne({
    customerId: subscription.customerId,
    organizationId,
    status: { $in: ['active', 'trial'] },
  });

  if (!otherActive) {
    await Customer.updateOne(
      { _id: subscription.customerId, organizationId },
      { $set: { lifecycleStatus: 'churned' } }
    );
  }

  await logAudit({
    organizationId,
    userId,
    action: 'CANCEL_SUBSCRIPTION',
    entityType: 'Subscription',
    entityId: subscription._id,
    metadata: { reason },
  });

  return subscription;
};

/**
 * Upgrades or downgrades a subscription to a new plan
 */
export const upgradeSubscription = async ({
  organizationId,
  subscriptionId,
  newPlanId,
  newBillingFrequency,
  newAmount,
  userId,
}) => {
  const subscription = await Subscription.findOne({ _id: subscriptionId, organizationId });
  if (!subscription) throw new Error('Subscription not found.');

  const newPlan = await SubscriptionPlan.findOne({ _id: newPlanId, organizationId });
  if (!newPlan) throw new Error('Target subscription plan not found.');

  const oldPlanId = subscription.planId;
  const oldAmount = subscription.amount;

  subscription.planId = newPlanId;
  if (newBillingFrequency) {
    subscription.billingFrequency = newBillingFrequency;
  }

  if (newAmount !== undefined && newAmount !== null) {
    subscription.amount = newAmount;
  } else {
    const freq = subscription.billingFrequency;
    subscription.amount =
      freq === 'annual'
        ? newPlan.pricing.annual
        : freq === 'quarterly'
        ? newPlan.pricing.quarterly || newPlan.pricing.monthly * 3
        : freq === 'semi_annual'
        ? newPlan.pricing.semiAnnual || newPlan.pricing.monthly * 6
        : newPlan.pricing.monthly;
  }

  subscription.history.push({
    action: subscription.amount >= oldAmount ? 'upgraded' : 'downgraded',
    fromPlan: oldPlanId,
    toPlan: newPlanId,
    reason: `Plan transitioned from ${oldPlanId} to ${newPlan.name} (Amount: ${subscription.amount})`,
    changedAt: new Date(),
  });

  await subscription.save();

  await logAudit({
    organizationId,
    userId,
    action: subscription.amount >= oldAmount ? 'UPGRADE_SUBSCRIPTION' : 'DOWNGRADE_SUBSCRIPTION',
    entityType: 'Subscription',
    entityId: subscription._id,
    metadata: { oldPlanId, newPlanId, oldAmount, newAmount: subscription.amount },
  });

  return subscription;
};

/**
 * Renews an active or expired subscription for another billing cycle
 */
export const renewSubscription = async ({ organizationId, subscriptionId, userId }) => {
  const subscription = await Subscription.findOne({ _id: subscriptionId, organizationId });
  if (!subscription) throw new Error('Subscription not found.');

  const newStart = new Date(subscription.currentPeriodEnd || Date.now());
  const newEnd = new Date(newStart);

  switch (subscription.billingFrequency) {
    case 'monthly':
      newEnd.setMonth(newEnd.getMonth() + 1);
      break;
    case 'quarterly':
      newEnd.setMonth(newEnd.getMonth() + 3);
      break;
    case 'semi_annual':
      newEnd.setMonth(newEnd.getMonth() + 6);
      break;
    case 'annual':
      newEnd.setFullYear(newEnd.getFullYear() + 1);
      break;
    default:
      newEnd.setMonth(newEnd.getMonth() + 1);
  }

  subscription.currentPeriodStart = newStart;
  subscription.currentPeriodEnd = newEnd;
  subscription.nextRenewalDate = newEnd;
  subscription.status = 'active';
  subscription.paymentStatus = 'paid';

  subscription.history.push({
    action: 'renewed',
    fromStatus: subscription.status,
    toStatus: 'active',
    reason: `Subscription renewed until ${newEnd.toISOString().split('T')[0]}`,
    changedAt: new Date(),
  });

  await subscription.save();

  await logAudit({
    organizationId,
    userId,
    action: 'RENEW_SUBSCRIPTION',
    entityType: 'Subscription',
    entityId: subscription._id,
    metadata: { newPeriodEnd: newEnd },
  });

  return subscription;
};
