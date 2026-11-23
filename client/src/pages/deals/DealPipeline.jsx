import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Kanban,
  TrendingUp,
  Award,
  AlertCircle,
  Calendar,
  Building,
  User,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { toast } from 'sonner';

const STAGE_CONFIG = [
  { key: 'discovery', label: 'Discovery', color: 'border-slate-400', badgeColor: 'bg-slate-100 text-slate-700' },
  { key: 'qualified', label: 'Qualification', color: 'border-sky-500', badgeColor: 'bg-sky-100 text-sky-800' },
  { key: 'proposal', label: 'Proposal Sent', color: 'border-indigo-500', badgeColor: 'bg-indigo-100 text-indigo-800' },
  { key: 'negotiation', label: 'Negotiation', color: 'border-amber-500', badgeColor: 'bg-amber-100 text-amber-800' },
  { key: 'closed_won', label: 'Closed Won', color: 'border-emerald-500', badgeColor: 'bg-emerald-100 text-emerald-800' },
  { key: 'closed_lost', label: 'Closed Lost', color: 'border-rose-500', badgeColor: 'bg-rose-100 text-rose-800' },
];

export const DealPipeline = () => {
  const [columns, setColumns] = useState([]);
  const [forecast, setForecast] = useState({
    totalDeals: 0,
    totalPipelineValue: 0,
    weightedForecast: 0,
    wonValue: 0,
    winRate: 0,
  });
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    value: '',
    stage: 'discovery',
    probability: 10,
    expectedCloseDate: '',
    companyId: '',
    contactId: '',
    priority: 'medium',
    notes: '',
  });

  const fetchPipelineData = async () => {
    try {
      setLoading(true);
      const [pipelineRes, forecastRes, compRes, contactRes] = await Promise.all([
        api.get('/deals/pipeline'),
        api.get('/deals/forecast'),
        api.get('/companies?limit=100'),
        api.get('/contacts?limit=100'),
      ]);

      setColumns(pipelineRes.data.data || []);
      setForecast(forecastRes.data.data || {});
      setCompanies(compRes.data.data || []);
      setContacts(contactRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load deals pipeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const handleStageChange = async (dealId, newStage) => {
    try {
      let lostReason = '';
      if (newStage === 'closed_lost') {
        lostReason = window.prompt('Please enter the reason for losing this deal:') || 'Price competition';
      }

      await api.patch(`/deals/${dealId}/stage`, { stage: newStage, lostReason });
      toast.success(`Deal moved to ${newStage.replace('_', ' ')}`);
      fetchPipelineData();
    } catch (err) {
      toast.error('Failed to move deal.');
    }
  };

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.value) {
      toast.error('Title and value are required');
      return;
    }

    try {
      const payload = { ...formData, value: Number(formData.value) };
      if (!payload.companyId) delete payload.companyId;
      if (!payload.contactId) delete payload.contactId;

      await api.post('/deals', payload);
      toast.success('Deal created successfully');
      setIsModalOpen(false);
      setFormData({
        title: '',
        value: '',
        stage: 'discovery',
        probability: 10,
        expectedCloseDate: '',
        companyId: '',
        contactId: '',
        priority: 'medium',
        notes: '',
      });
      fetchPipelineData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create deal.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Kanban className="w-7 h-7 text-teal-600" />
            Visual Sales Pipeline & Deals
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track revenue progression, probability-weighted forecasts, and deal closure velocity.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Plus className="w-4 h-4" />
          Add Deal
        </Button>
      </div>

      {/* Forecasting Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Pipeline</p>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            ${(forecast.totalPipelineValue || 0).toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">{forecast.totalDeals} Total Opportunities</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Weighted Forecast</p>
          <h3 className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">
            ${(forecast.weightedForecast || 0).toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Probability adjusted</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Closed Won</p>
          <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            ${(forecast.wonValue || 0).toLocaleString()}
          </h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Realized revenue</p>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Closing Win Rate</p>
          <h3 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {forecast.winRate || 0}%
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Conversion efficiency</p>
        </Card>
      </div>

      {/* Kanban Board Container */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1200px]">
          {STAGE_CONFIG.map((stageCfg) => {
            const col = columns.find((c) => c.stage === stageCfg.key) || {
              stage: stageCfg.key,
              count: 0,
              totalValue: 0,
              deals: [],
            };

            return (
              <div
                key={stageCfg.key}
                className="flex-1 min-w-[240px] bg-slate-100/70 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[750px]"
              >
                {/* Stage Header */}
                <div className={`border-t-4 ${stageCfg.color} pt-2 pb-2.5 mb-2`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {stageCfg.label}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      {col.count}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-1">
                    ${(col.totalValue || 0).toLocaleString()}
                  </div>
                </div>

                {/* Cards List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {col.deals.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      No deals in this stage
                    </div>
                  ) : (
                    col.deals.map((deal) => (
                      <div
                        key={deal._id}
                        className="bg-white dark:bg-slate-800/90 rounded-lg p-3.5 shadow-xs border border-slate-200 dark:border-slate-700/80 hover:shadow-md transition-shadow group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                            {deal.title}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between mt-2.5">
                          <span className="text-base font-extrabold text-teal-600 dark:text-teal-400">
                            ${(deal.value || 0).toLocaleString()}
                          </span>
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {deal.probability}% prob
                          </span>
                        </div>

                        {deal.companyId?.name && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2 truncate">
                            <Building className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{deal.companyId.name}</span>
                          </div>
                        )}

                        {deal.expectedCloseDate && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1.5">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}</span>
                          </div>
                        )}

                        {/* Move Stage Selector */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Move to:</span>
                          <select
                            value={deal.stage}
                            onChange={(e) => handleStageChange(deal._id, e.target.value)}
                            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          >
                            {STAGE_CONFIG.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Deal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Sales Deal"
      >
        <form onSubmit={handleCreateDeal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deal Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              placeholder="e.g. Acme Enterprise SaaS License"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Deal Value ($) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                placeholder="25000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pipeline Stage
              </label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              >
                {STAGE_CONFIG.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Probability (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expected Close Date
              </label>
              <input
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Account
              </label>
              <select
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              >
                <option value="">None</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Person
              </label>
              <select
                value={formData.contactId}
                onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              >
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deal Notes
            </label>
            <textarea
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              placeholder="Requirements, customer budget, decision timeframe..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              Create Deal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DealPipeline;
