import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Clock,
  ArrowRight,
  History,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { toast } from 'sonner';

const TRIGGER_LABELS = {
  lead_created: 'New Lead Created',
  lead_stage_changed: 'Lead Stage Changed',
  deal_created: 'Deal Created',
  deal_stage_changed: 'Deal Stage Changed',
  deal_won: 'Deal Won (100%)',
  subscription_created: 'New Subscription Created',
  subscription_cancelled: 'Subscription Cancelled',
  subscription_expiring: 'Subscription Expiring Soon',
  ticket_created: 'Urgent Ticket Logged',
  payment_failed: 'Payment Failed',
};

export const AutomationCenter = () => {
  const [rules, setRules] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'executions'
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'deal_won',
    actionType: 'create_task',
    actionTitle: 'Customer Onboarding Handover',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes, execRes] = await Promise.all([
        api.get('/automations'),
        api.get('/automations/executions?limit=30'),
      ]);

      setRules(rulesRes.data.data || []);
      setExecutions(execRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load automation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggle = async (ruleId) => {
    try {
      const res = await api.patch(`/automations/${ruleId}/toggle`);
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      toast.error('Failed to toggle rule');
    }
  };

  const handleRunNow = async (ruleId, ruleName) => {
    try {
      toast.loading(`Triggering "${ruleName}"...`, { id: 'run-rule' });
      await api.post(`/automations/${ruleId}/trigger`);
      toast.success(`Rule "${ruleName}" executed successfully!`, { id: 'run-rule' });
      fetchData();
    } catch (err) {
      toast.error('Rule execution failed', { id: 'run-rule' });
    }
  };

  const handleDelete = async (ruleId, ruleName) => {
    if (!window.confirm(`Delete rule "${ruleName}"?`)) return;
    try {
      await api.delete(`/automations/${ruleId}`);
      toast.success('Rule deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete rule');
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Rule name is required');
      return;
    }

    try {
      await api.post('/automations', {
        name: formData.name,
        description: formData.description,
        triggerType: formData.triggerType,
        actions: [
          {
            actionType: formData.actionType,
            payload: {
              title: formData.actionTitle,
              message: `Triggered automatically by ${formData.name}`,
            },
          },
        ],
        isActive: true,
      });

      toast.success('Automation rule created');
      setIsModalOpen(false);
      setFormData({
        name: '',
        description: '',
        triggerType: 'deal_won',
        actionType: 'create_task',
        actionTitle: 'Customer Onboarding Handover',
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create rule.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Zap className="w-7 h-7 text-amber-500" />
            Workflow Automation Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build event-driven rules to automate follow-up tasks, churn interventions, notifications, and onboarding.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Plus className="w-4 h-4" />
          Create Automation Rule
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          Active Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('executions')}
          className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'executions'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          Execution Log History ({executions.length})
        </button>
      </div>

      {/* Tab: Rules List */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading automation rules...
            </div>
          ) : rules.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              No automation rules configured yet. Click "Create Automation Rule" to get started.
            </Card>
          ) : (
            rules.map((rule) => (
              <Card
                key={rule._id}
                className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {rule.name}
                      </h3>
                      <Badge
                        className={`text-xs ${
                          rule.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {rule.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>

                    {rule.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{rule.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        When: {TRIGGER_LABELS[rule.triggerType] || rule.triggerType}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded">
                        Then: {rule.actions?.map((a) => a.actionType.replace('_', ' ')).join(', ')}
                      </span>
                      {rule.executionCount > 0 && (
                        <span className="text-slate-400 ml-2">
                          • Triggered {rule.executionCount} time{rule.executionCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs flex items-center gap-1.5"
                      onClick={() => handleRunNow(rule._id, rule.name)}
                    >
                      <Play className="w-3.5 h-3.5 text-amber-500 fill-current" />
                      Run Now
                    </Button>

                    <button
                      onClick={() => handleToggle(rule._id)}
                      className="p-1 text-slate-400 hover:text-teal-600 transition-colors"
                      title={rule.isActive ? 'Disable Rule' : 'Enable Rule'}
                    >
                      {rule.isActive ? (
                        <ToggleRight className="w-7 h-7 text-teal-600" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-400" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(rule._id, rule.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab: Executions History */}
      {activeTab === 'executions' && (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Trigger Event</th>
                  <th className="px-6 py-3.5">Rule Name</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Execution Details</th>
                  <th className="px-6 py-3.5">Executed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-slate-400">
                      No executions recorded yet.
                    </td>
                  </tr>
                ) : (
                  executions.map((ex) => (
                    <tr key={ex._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {TRIGGER_LABELS[ex.triggerEvent] || ex.triggerEvent}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {ex.ruleId?.name || 'Manual Test Trigger'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={`text-xs ${
                            ex.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {ex.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {ex.logs?.join(' | ') || 'Action dispatched'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(ex.executedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Automation Rule"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Rule Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              placeholder="e.g. Automatically schedule onboarding on deal won"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              placeholder="Brief explanation of this automation workflow"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Trigger Event *
            </label>
            <select
              value={formData.triggerType}
              onChange={(e) => setFormData({ ...formData, triggerType: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
            >
              <option value="deal_won">When a Deal is Closed Won</option>
              <option value="lead_created">When a New Lead is Created</option>
              <option value="subscription_cancelled">When a Subscription is Cancelled</option>
              <option value="subscription_expiring">When a Subscription is Expiring Soon</option>
              <option value="payment_failed">When a Payment Fails</option>
              <option value="ticket_created">When an Urgent Ticket is Created</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Action to Dispatch *
              </label>
              <select
                value={formData.actionType}
                onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              >
                <option value="create_task">Create Follow-up Task</option>
                <option value="send_notification">Send In-App Notification</option>
                <option value="send_email">Dispatch Email Notification</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Action Subject / Title *
              </label>
              <input
                type="text"
                required
                value={formData.actionTitle}
                onChange={(e) => setFormData({ ...formData, actionTitle: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                placeholder="e.g. Schedule onboarding call"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              Create Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AutomationCenter;
