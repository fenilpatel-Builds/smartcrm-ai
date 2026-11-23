import { Organization } from '../models/Organization.js';
import { Customer } from '../models/Customer.js';
import { Contact } from '../models/Contact.js';
import { Deal } from '../models/Deal.js';
import { User } from '../models/User.js';
import { Document } from '../models/Document.js';
import { AutomationRule } from '../models/AutomationRule.js';

export const checkPlanLimit = async (organizationId, resourceType) => {
  const org = await Organization.findById(organizationId);
  if (!org) return { allowed: false, message: 'Organization not found.' };

  const limits = org.planLimits || {
    maxUsers: 25,
    maxCustomers: 500,
    maxContacts: 1000,
    maxDeals: 200,
    maxStorageMB: 1024,
    monthlyEmailAllowance: 2000,
  };

  switch (resourceType) {
    case 'users': {
      const current = await User.countDocuments({ organizationId });
      if (current >= limits.maxUsers) {
        return {
          allowed: false,
          current,
          limit: limits.maxUsers,
          resource: 'users',
          message: `User limit reached (${current}/${limits.maxUsers}). Please upgrade your SaaS plan to invite more team members.`,
        };
      }
      return { allowed: true, current, limit: limits.maxUsers };
    }

    case 'customers': {
      const current = await Customer.countDocuments({ organizationId, isDeleted: false });
      if (current >= limits.maxCustomers) {
        return {
          allowed: false,
          current,
          limit: limits.maxCustomers,
          resource: 'customers',
          message: `Customer account limit reached (${current}/${limits.maxCustomers}). Upgrade your subscription tier to expand capacity.`,
        };
      }
      return { allowed: true, current, limit: limits.maxCustomers };
    }

    case 'contacts': {
      const current = await Contact.countDocuments({ organizationId });
      if (current >= limits.maxContacts) {
        return {
          allowed: false,
          current,
          limit: limits.maxContacts,
          resource: 'contacts',
          message: `Contact limit reached (${current}/${limits.maxContacts}). Upgrade your plan to manage more individual contacts.`,
        };
      }
      return { allowed: true, current, limit: limits.maxContacts };
    }

    case 'deals': {
      const current = await Deal.countDocuments({
        organizationId,
        isDeleted: false,
        stage: { $nin: ['closed_won', 'closed_lost'] },
      });
      if (current >= limits.maxDeals) {
        return {
          allowed: false,
          current,
          limit: limits.maxDeals,
          resource: 'deals',
          message: `Active open deals limit reached (${current}/${limits.maxDeals}). Please close existing deals or upgrade your plan.`,
        };
      }
      return { allowed: true, current, limit: limits.maxDeals };
    }

    case 'storage': {
      const docs = await Document.aggregate([
        { $match: { organizationId, isDeleted: false } },
        { $group: { _id: null, totalBytes: { $sum: '$fileSize' } } },
      ]);
      const currentMB = Math.round(((docs[0]?.totalBytes || 0) / (1024 * 1024)) * 100) / 100;
      if (currentMB >= limits.maxStorageMB) {
        return {
          allowed: false,
          current: currentMB,
          limit: limits.maxStorageMB,
          resource: 'storage',
          message: `Document vault storage limit reached (${currentMB}MB / ${limits.maxStorageMB}MB). Upgrade plan for more vault storage.`,
        };
      }
      return { allowed: true, current: currentMB, limit: limits.maxStorageMB };
    }

    case 'automations': {
      const maxAutomations = limits.maxAutomations || 15;
      const current = await AutomationRule.countDocuments({ organizationId });
      if (current >= maxAutomations) {
        return {
          allowed: false,
          current,
          limit: maxAutomations,
          resource: 'automations',
          message: `Automation rules limit reached (${current}/${maxAutomations}). Upgrade your plan to create more automated workflows.`,
        };
      }
      return { allowed: true, current, limit: maxAutomations };
    }

    default:
      return { allowed: true };
  }
};

/**
 * Express middleware to enforce SaaS plan limits on creation endpoints
 */
export const enforcePlanLimit = (resourceType) => async (req, res, next) => {
  try {
    // Super admins bypass all tier limitations
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    const check = await checkPlanLimit(req.organizationId, resourceType);
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        code: 'PLAN_LIMIT_EXCEEDED',
        message: check.message,
        details: {
          resource: check.resource,
          current: check.current,
          limit: check.limit,
        },
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
