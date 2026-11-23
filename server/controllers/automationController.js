import { AutomationRule } from '../models/AutomationRule.js';
import { AutomationExecution } from '../models/AutomationExecution.js';
import { Task } from '../models/Task.js';
import { Notification } from '../models/Notification.js';
import { logAudit } from '../services/audit/auditService.js';

export const getRules = async (req, res, next) => {
  try {
    const { triggerType, isActive, search } = req.query;
    const query = { organizationId: req.organizationId };

    if (triggerType && triggerType !== 'all') {
      query.triggerType = triggerType;
    }

    if (isActive !== undefined && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const rules = await AutomationRule.find(query)
      .populate('createdBy', 'name email avatar')
      .sort('-createdAt');

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
};

export const getRuleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await AutomationRule.findOne({ _id: id, organizationId: req.organizationId })
      .populate('createdBy', 'name email avatar');

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Automation rule not found.' });
    }

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
};

export const createRule = async (req, res, next) => {
  try {
    const { name, description, triggerType, conditions, actions, isActive = true } = req.body;

    if (!name || !triggerType || !actions || actions.length === 0) {
      return res.status(400).json({ success: false, message: 'Name, trigger type, and at least one action are required.' });
    }

    const rule = await AutomationRule.create({
      organizationId: req.organizationId,
      name: name.trim(),
      description: description || '',
      triggerType,
      conditions: conditions || [],
      actions,
      isActive: Boolean(isActive),
      createdBy: req.user._id,
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'CREATE_AUTOMATION_RULE',
      entityType: 'AutomationRule',
      entityId: rule._id,
      metadata: { name: rule.name, triggerType: rule.triggerType },
    });

    res.status(201).json({
      success: true,
      message: 'Automation rule created successfully',
      data: rule,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await AutomationRule.findOne({ _id: id, organizationId: req.organizationId });

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Automation rule not found.' });
    }

    Object.assign(rule, req.body);
    await rule.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPDATE_AUTOMATION_RULE',
      entityType: 'AutomationRule',
      entityId: rule._id,
      metadata: { name: rule.name },
    });

    res.json({
      success: true,
      message: 'Automation rule updated successfully',
      data: rule,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await AutomationRule.findOne({ _id: id, organizationId: req.organizationId });

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Automation rule not found.' });
    }

    rule.isActive = !rule.isActive;
    await rule.save();

    res.json({
      success: true,
      message: `Rule ${rule.isActive ? 'activated' : 'deactivated'} successfully`,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await AutomationRule.findOneAndDelete({ _id: id, organizationId: req.organizationId });

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Automation rule not found.' });
    }

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'DELETE_AUTOMATION_RULE',
      entityType: 'AutomationRule',
      entityId: rule._id,
      metadata: { name: rule.name },
    });

    res.json({
      success: true,
      message: 'Automation rule deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const triggerRuleManually = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rule = await AutomationRule.findOne({ _id: id, organizationId: req.organizationId });

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Automation rule not found.' });
    }

    const logs = [];
    logs.push(`Manual trigger started for rule: ${rule.name}`);

    // Execute actions
    for (const act of rule.actions) {
      if (act.actionType === 'create_task') {
        await Task.create({
          organizationId: req.organizationId,
          title: act.payload?.title || `Automated Task: ${rule.name}`,
          description: act.payload?.description || `Triggered by rule ${rule.name}`,
          priority: act.payload?.priority || 'medium',
          dueDate: new Date(Date.now() + 86400000 * 2), // 2 days
          assignedTo: req.user._id,
          status: 'pending',
        });
        logs.push(`Action executed: Created task "${act.payload?.title || rule.name}"`);
      } else if (act.actionType === 'send_notification') {
        await Notification.create({
          organizationId: req.organizationId,
          userId: req.user._id,
          title: 'Automation Executed',
          message: act.payload?.message || `Rule ${rule.name} has run successfully.`,
          type: 'info',
        });
        logs.push('Action executed: Generated user notification');
      } else {
        logs.push(`Action simulated: ${act.actionType}`);
      }
    }

    rule.lastTriggeredAt = new Date();
    rule.executionCount = (rule.executionCount || 0) + 1;
    await rule.save();

    const execution = await AutomationExecution.create({
      organizationId: req.organizationId,
      ruleId: rule._id,
      triggerEvent: rule.triggerType,
      status: 'success',
      logs,
      executedAt: new Date(),
    });

    res.json({
      success: true,
      message: 'Automation executed successfully',
      data: execution,
    });
  } catch (error) {
    next(error);
  }
};

export const getExecutions = async (req, res, next) => {
  try {
    const { ruleId, page = 1, limit = 20 } = req.query;
    const query = { organizationId: req.organizationId };

    if (ruleId) {
      query.ruleId = ruleId;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [executions, total] = await Promise.all([
      AutomationExecution.find(query)
        .populate('ruleId', 'name triggerType')
        .sort('-executedAt')
        .skip(skip)
        .limit(parseInt(limit, 10)),
      AutomationExecution.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: executions,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};
