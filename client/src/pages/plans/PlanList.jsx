import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Layers, Plus, Check, Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

export const PlanList = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monthlyPrice: '',
    quarterlyPrice: '',
    annualPrice: '',
    featuresText: '',
    trialDays: '0',
    isActive: true,
  });

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/plans');
      if (res.data.success) {
        setPlans(res.data.data);
      }
    } catch (e) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      monthlyPrice: '',
      quarterlyPrice: '',
      annualPrice: '',
      featuresText: '',
      trialDays: '0',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      monthlyPrice: plan.pricing?.monthly || '',
      quarterlyPrice: plan.pricing?.quarterly || '',
      annualPrice: plan.pricing?.annual || '',
      featuresText: plan.features?.join('\n') || '',
      trialDays: String(plan.trialDays || 0),
      isActive: plan.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      description: formData.description,
      pricing: {
        monthly: Number(formData.monthlyPrice),
        quarterly: Number(formData.quarterlyPrice) || Number(formData.monthlyPrice) * 3,
        annual: Number(formData.annualPrice) || Number(formData.monthlyPrice) * 10,
      },
      features: formData.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
      trialDays: Number(formData.trialDays) || 0,
      isActive: formData.isActive,
    };

    try {
      if (editingPlan) {
        await api.patch(`/plans/${editingPlan._id}`, payload);
        toast.success('Plan updated successfully!');
      } else {
        await api.post('/plans', payload);
        toast.success('Plan created successfully!');
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving plan');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete plan "${name}"?`)) return;
    try {
      await api.delete(`/plans/${id}`);
      toast.success('Plan removed.');
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting plan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Subscription Plans
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure your product tiers, recurring pricing rates, feature allowances, and trial periods.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={openCreateModal}>
          <Plus className="w-4 h-4" />
          Create New Plan
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))
        ) : plans.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-400">
            No subscription plans created yet. Click "Create New Plan" to get started.
          </div>
        ) : (
          plans.map((p) => (
            <Card
              key={p._id}
              className={`flex flex-col justify-between border-2 ${
                p.isActive ? 'border-slate-200 dark:border-slate-800' : 'opacity-60 border-dashed'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">{p.name}</h3>
                  <Badge variant={p.isActive ? 'primary' : 'default'}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-500 mt-2 min-h-[32px]">
                  {p.description || 'Standard plan tier.'}
                </p>

                {/* Price Display */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                      ${p.pricing?.monthly}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">/ month</span>
                  </div>
                  <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-0.5">
                    or ${p.pricing?.annual}/year (save ~17%)
                  </p>
                  {p.trialDays > 0 && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1">
                      🎁 {p.trialDays}-day free trial included
                    </p>
                  )}
                </div>

                {/* Feature List */}
                <div className="mt-4 space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Included Capabilities
                  </span>
                  {p.features?.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plan Footer: Stats & Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {p.activeSubscribers || 0} active subscribers
                </span>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditModal(p)}>
                    <Edit className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p._id, p.name)}>
                    <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-700" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Plan Modal (Add / Edit) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? `Edit ${editingPlan.name}` : 'Create Subscription Plan'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Plan Name *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Professional Growth"
          />

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Short overview of who this tier is built for..."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Monthly Price ($) *"
              type="number"
              required
              value={formData.monthlyPrice}
              onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
              placeholder="149"
            />
            <Input
              label="Annual Price ($) *"
              type="number"
              required
              value={formData.annualPrice}
              onChange={(e) => setFormData({ ...formData, annualPrice: e.target.value })}
              placeholder="1490"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quarterly Price (Optional)"
              type="number"
              value={formData.quarterlyPrice}
              onChange={(e) => setFormData({ ...formData, quarterlyPrice: e.target.value })}
              placeholder="420"
            />
            <Input
              label="Trial Duration (Days)"
              type="number"
              value={formData.trialDays}
              onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="w-full">
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              Features (One per line)
            </label>
            <textarea
              rows={4}
              value={formData.featuresText}
              onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
              className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              placeholder={`Up to 10,000 Contacts\nAutomated Invoicing\nPriority Support`}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="isActiveToggle" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Active and available for customer subscription
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
