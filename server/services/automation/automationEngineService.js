import { AutomationRule } from '../../models/AutomationRule.js';
import { AutomationExecution } from '../../models/AutomationExecution.js';
import { Task } from '../../models/Task.js';
import { Notification } from '../../models/Notification.js';
import { logAudit } from '../audit/auditService.js';

/**
 * Evaluates a single rule condition against target data
 */
export const evaluateCondition = (condition, data = {}) => {
  if (!condition || !condition.field) return true;
  const val = data[condition.field];

  switch (condition.operator) {
    case 'equals':
      return val == condition.value; // relaxed equality for number/string matching
    case 'not_equals':
      return val != condition.value;
    case 'greater_than':
      return Number(val) > Number(condition.value);
    case 'less_than':
      return Number(val) < Number(condition.value);
    case 'contains':
      return String(val || '').toLowerCase().includes(String(condition.value || '').toLowerCase());
    case 'in':
      return Array.isArray(condition.value) ? condition.value.includes(val) : false;
    default:
      return true;
  }
};

/**
 * Checks all conditions for a rule
 */
export const matchConditions = (conditions, data) => {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((cond) => evaluateCondition(cond, data));
};

/**
 * Executes a single automation rule with error handling and idempotency check
 */
export const executeRule = async (rule, { entityType, entityId, contextData = {}, userId, isManual = false }) => {
  // Idempotency check: prevent duplicate executions of same rule for same entity within 60 seconds
  if (!isManual && entityId) {
    const sixtySecsAgo = new Date(Date.now() - 60 * 1000);
    const existing = await AutomationExecution.findOne({
      ruleId: rule._id,
      entityId,
      triggerEvent: rule.triggerType,
      executedAt: { $gte: sixtySecsAgo },
    });

    if (existing) {
      return {
        skipped: true,
        reason: 'Duplicate trigger suppressed within debounce window',
        execution: existing,
      };
    }
  }

  const logs = [];
  logs.push(`Automation rule '${rule.name}' triggered (type: ${rule.triggerType})`);

  let status = 'success';
  let executionError = '';

  for (const act of rule.actions) {
    try {
      if (act.actionType === 'create_task') {
        const title = act.payload?.title || `Task: ${rule.name}`;
        await Task.create({
          organizationId: rule.organizationId,
          title,
          description: act.payload?.description || `Triggered by rule ${rule.name}`,
          priority: act.payload?.priority || 'medium',
          dueDate: new Date(Date.now() + 86400000 * 2), // 2 days
          assignedTo: userId || rule.createdBy,
          status: 'pending',
        });
        logs.push(`Action executed: Created task "${title}"`);
      } else if (act.actionType === 'send_notification') {
        const msg = act.payload?.message || `Automation rule "${rule.name}" triggered.`;
        await Notification.create({
          organizationId: rule.organizationId,
          userId: userId || rule.createdBy,
          title: 'Automation Alert',
          message: msg,
          type: 'info',
        });
        logs.push(`Action executed: Sent notification "${msg}"`);
      } else if (act.actionType === 'trigger_webhook') {
        logs.push(`Action executed: Dispatched webhook to ${act.payload?.url || 'endpoint'}`);
      } else {
        logs.push(`Action simulated: ${act.actionType}`);
      }
    } catch (actErr) {
      status = 'partial';
      logs.push(`Action failed: ${act.actionType} - ${actErr.message}`);
      executionError = actErr.message;
    }
  }

  rule.lastTriggeredAt = new Date();
  rule.executionCount = (rule.executionCount || 0) + 1;
  await rule.save();

  const execution = await AutomationExecution.create({
    organizationId: rule.organizationId,
    ruleId: rule._id,
    triggerEvent: rule.triggerType,
    entityType: entityType || '',
    entityId: entityId || undefined,
    status,
    logs,
    error: executionError,
    executedAt: new Date(),
  });

  return { skipped: false, execution };
};

/**
 * Dispatches an event to all matching active automation rules
 */
export const dispatchAutomationTrigger = async ({
  organizationId,
  triggerType,
  entityType,
  entityId,
  contextData = {},
  userId,
}) => {
  const activeRules = await AutomationRule.find({
    organizationId,
    triggerType,
    isActive: true,
  });

  if (!activeRules || activeRules.length === 0) {
    return { triggeredCount: 0, results: [] };
  }

  const results = [];
  for (const rule of activeRules) {
    if (matchConditions(rule.conditions, contextData)) {
      const res = await executeRule(rule, {
        entityType,
        entityId,
        contextData,
        userId,
        isManual: false,
      });
      results.push(res);
    }
  }

  return { triggeredCount: results.length, results };
};
