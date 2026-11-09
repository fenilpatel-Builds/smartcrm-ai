import { Subscription } from '../../models/Subscription.js';
import { SubscriptionPlan } from '../../models/SubscriptionPlan.js';
import { Customer } from '../../models/Customer.js';
import { logAudit } from '../audit/auditService.js';

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
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'semi_annual':
      return amount / 6;
    case 'annual':
      return amount / 12;
    default:
      return amount;
  }
};

/**
 * Calculates normalized Annual Recurring Revenue (ARR) for a single subscription
 */
export const calculateSubscriptionARR = (subscription) => {
  return calculateSubscriptionMRR(subscription) * 12;
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
