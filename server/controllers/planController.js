import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Subscription } from '../models/Subscription.js';
import { logAudit } from '../services/audit/auditService.js';

export const createPlan = async (req, res, next) => {
  try {
    const { name, description, pricing, features, trialDays, isActive } = req.body;

    if (!name || !pricing || pricing.monthly === undefined || pricing.annual === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Plan name, monthly pricing, and annual pricing are required.',
      });
    }

    const plan = await SubscriptionPlan.create({
      organizationId: req.organizationId,
      name: name.trim(),
      description: description || '',
      pricing: {
        monthly: Number(pricing.monthly),
        quarterly: pricing.quarterly ? Number(pricing.quarterly) : Number(pricing.monthly) * 3,
        semiAnnual: pricing.semiAnnual ? Number(pricing.semiAnnual) : Number(pricing.monthly) * 6,
        annual: Number(pricing.annual),
      },
      features: Array.isArray(features) ? features : [],
      trialDays: Number(trialDays) || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'CREATE_SUBSCRIPTION_PLAN',
      entityType: 'SubscriptionPlan',
      entityId: plan._id,
      metadata: { name: plan.name, pricing: plan.pricing },
    });

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlans = async (req, res, next) => {
  try {
    const plans = await SubscriptionPlan.find({ organizationId: req.organizationId }).sort({ 'pricing.monthly': 1 });

    // Aggregate subscriber count per plan
    const counts = await Subscription.aggregate([
      { $match: { organizationId: req.organizationId, status: { $in: ['active', 'trial'] } } },
      { $group: { _id: '$planId', count: { $sum: 1 } } },
    ]);

    const enrichedPlans = plans.map((p) => {
      const match = counts.find((c) => c._id.toString() === p._id.toString());
      return {
        ...p.toObject(),
        activeSubscribers: match ? match.count : 0,
      };
    });

    res.json({
      success: true,
      data: enrichedPlans,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findOne({ _id: id, organizationId: req.organizationId });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found.' });

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const plan = await SubscriptionPlan.findOne({ _id: id, organizationId: req.organizationId });
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found.' });

    if (updates.name) plan.name = updates.name;
    if (updates.description !== undefined) plan.description = updates.description;
    if (updates.pricing) plan.pricing = { ...plan.pricing, ...updates.pricing };
    if (updates.features) plan.features = updates.features;
    if (updates.trialDays !== undefined) plan.trialDays = updates.trialDays;
    if (updates.isActive !== undefined) plan.isActive = updates.isActive;

    await plan.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPDATE_SUBSCRIPTION_PLAN',
      entityType: 'SubscriptionPlan',
      entityId: plan._id,
      metadata: updates,
    });

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if active subscriptions depend on this plan
    const activeDependents = await Subscription.countDocuments({
      planId: id,
      organizationId: req.organizationId,
      status: { $in: ['active', 'trial', 'paused'] },
    });

    if (activeDependents > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan. There are ${activeDependents} active subscription(s) currently assigned to it. Deactivate the plan instead.`,
      });
    }

    await SubscriptionPlan.deleteOne({ _id: id, organizationId: req.organizationId });

    res.json({
      success: true,
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
