import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Input';
import {
  CreditCard,
  Plus,
  Play,
  Pause,
  XCircle,
  TrendingUp,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

export const SubscriptionList = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [targetPlanId, setTargetPlanId] = useState('');
  const [targetFrequency, setTargetFrequency] = useState('monthly');

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscriptions', {
        params: { status: statusFilter !== 'all' ? statusFilter : undefined },
      });
      if (res.data.success) {
        setSubscriptions(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/plans');
      if (res.data.success) setPlans(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
  }, [statusFilter]);

  const handlePause = async (id) => {
    const reason = prompt('Reason for pause:');
    if (reason === null) return;
    try {
      await api.post(`/subscriptions/${id}/pause`, { reason });
      toast.success('Subscription paused.');
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error pausing subscription');
    }
  };

  const handleResume = async (id) => {
    try {
      await api.post(`/subscriptions/${id}/resume`);
      toast.success('Subscription resumed and active.');
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error resuming subscription');
    }
  };

  const handleCancel = async (id) => {
    const reason = prompt('Reason for cancellation:');
    if (reason === null) return;
    try {
      await api.post(`/subscriptions/${id}/cancel`, { reason });
      toast.success('Subscription cancelled.');
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error cancelling subscription');
    }
  };

  const handleUpgradeSubmit = async (e) => {
    e.preventDefault();
    if (!targetPlanId) return;

    try {
      await api.post(`/subscriptions/${selectedSub._id}/upgrade`, {
        newPlanId: targetPlanId,
        newBillingFrequency: targetFrequency,
      });
      toast.success('Plan transitioned successfully!');
      setIsUpgradeModalOpen(false);
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update plan');
    }
  };

  const filteredSubs = subscriptions.filter((s) => {
    if (!search) return true;
    const name = s.customerId?.name?.toLowerCase() || '';
    const company = s.customerId?.company?.toLowerCase() || '';
    const plan = s.planId?.name?.toLowerCase() || '';
    return name.includes(search.toLowerCase()) || company.includes(search.toLowerCase()) || plan.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Customer Subscriptions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage active subscriber tiers, billing intervals, pauses, cancellations, and upgrades.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/plans">
            <Button variant="outline" size="sm">
              <Layers className="w-4 h-4" />
              Manage Subscription Plans
            </Button>
          </Link>
          <Link to="/customers">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4" />
              Assign to Customer
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, company, or plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="trial">Trial</option>
              <option value="past_due">Past Due (Payment Issue)</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Subscriptions Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Plan Name</th>
                <th className="py-3 px-4">Frequency</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Normalized MRR</th>
                <th className="py-3 px-4">Renewal Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="p-4">
                      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </td>
                  </tr>
                ))
              ) : filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No subscriptions matching the filter.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => (
                  <tr key={sub._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <Link
                        to={`/customers/${sub.customerId?._id}`}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600"
                      >
                        {sub.customerId?.name}
                      </Link>
                      <p className="text-[11px] text-slate-400">{sub.customerId?.company}</p>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {sub.planId?.name || 'Custom Plan'}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600 dark:text-slate-400">
                      {sub.billingFrequency}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      ${sub.amount}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-teal-600 dark:text-teal-400">
                      ${sub.mrr?.toFixed(2)}/mo
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(sub.nextRenewalDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          sub.status === 'active'
                            ? 'success'
                            : sub.status === 'paused'
                            ? 'warning'
                            : sub.status === 'past_due'
                            ? 'danger'
                            : 'default'
                        }
                      >
                        {sub.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {sub.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Pause"
                          onClick={() => handlePause(sub._id)}
                        >
                          <Pause className="w-4 h-4 text-amber-500" />
                        </Button>
                      )}
                      {sub.status === 'paused' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Resume"
                          onClick={() => handleResume(sub._id)}
                        >
                          <Play className="w-4 h-4 text-emerald-500" />
                        </Button>
                      )}
                      {sub.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Modify / Upgrade"
                          onClick={() => {
                            setSelectedSub(sub);
                            setTargetPlanId(sub.planId?._id);
                            setTargetFrequency(sub.billingFrequency);
                            setIsUpgradeModalOpen(true);
                          }}
                        >
                          <TrendingUp className="w-4 h-4 text-teal-600" />
                        </Button>
                      )}
                      {sub.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Cancel"
                          onClick={() => handleCancel(sub._id)}
                        >
                          <XCircle className="w-4 h-4 text-rose-500" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upgrade / Modify Plan Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Upgrade or Modify Subscription"
      >
        <form onSubmit={handleUpgradeSubmit} className="space-y-4">
          <Select
            label="Target Plan *"
            required
            value={targetPlanId}
            onChange={(e) => setTargetPlanId(e.target.value)}
          >
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} (${p.pricing?.monthly}/mo - ${p.pricing?.annual}/yr)
              </option>
            ))}
          </Select>

          <Select
            label="Billing Cadence"
            value={targetFrequency}
            onChange={(e) => setTargetFrequency(e.target.value)}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="semi_annual">Semi-Annual</option>
            <option value="annual">Annual</option>
          </Select>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsUpgradeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Change
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
