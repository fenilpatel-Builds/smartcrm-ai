import { Subscription } from '../models/Subscription.js';
import * as subscriptionService from '../services/subscription/subscriptionService.js';

export const createSubscription = async (req, res, next) => {
  try {
    const { customerId, planId, billingFrequency, customAmount, startDate } = req.body;

    if (!customerId || !planId) {
      return res.status(400).json({ success: false, message: 'Customer ID and Plan ID are required.' });
    }

    const subscription = await subscriptionService.createSubscription({
      organizationId: req.organizationId,
      customerId,
      planId,
      billingFrequency,
      customAmount,
      startDate,
      userId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubscriptions = async (req, res, next) => {
  try {
    const { status, customerId, planId, search } = req.query;

    const query = { organizationId: req.organizationId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (planId) {
      query.planId = planId;
    }

    const subscriptions = await Subscription.find(query)
      .populate('customerId', 'name email company phone lifecycleStatus')
      .populate('planId', 'name pricing features')
      .sort({ createdAt: -1 });

    const enriched = subscriptions.map((s) => ({
      ...s.toObject(),
      mrr: subscriptionService.calculateSubscriptionMRR(s),
      arr: subscriptionService.calculateSubscriptionARR(s),
    }));

    res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubscriptionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subscription = await Subscription.findOne({ _id: id, organizationId: req.organizationId })
      .populate('customerId')
      .populate('planId');

    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found.' });

    res.json({
      success: true,
      data: {
        ...subscription.toObject(),
        mrr: subscriptionService.calculateSubscriptionMRR(subscription),
        arr: subscriptionService.calculateSubscriptionARR(subscription),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const pauseSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const subscription = await subscriptionService.pauseSubscription({
      organizationId: req.organizationId,
      subscriptionId: id,
      reason,
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Subscription paused successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

export const resumeSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;

    const subscription = await subscriptionService.resumeSubscription({
      organizationId: req.organizationId,
      subscriptionId: id,
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Subscription resumed successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const subscription = await subscriptionService.cancelSubscription({
      organizationId: req.organizationId,
      subscriptionId: id,
      reason,
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

export const upgradeSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPlanId, newBillingFrequency, newAmount } = req.body;

    if (!newPlanId) {
      return res.status(400).json({ success: false, message: 'New Plan ID is required for upgrade/downgrade.' });
    }

    const subscription = await subscriptionService.upgradeSubscription({
      organizationId: req.organizationId,
      subscriptionId: id,
      newPlanId,
      newBillingFrequency,
      newAmount,
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Subscription modified successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};
