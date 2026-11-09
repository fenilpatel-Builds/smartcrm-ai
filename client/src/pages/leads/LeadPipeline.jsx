import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import {
  Target,
  Plus,
  ArrowRight,
  CheckCircle,
  XCircle,
  ExternalLink,
  DollarSign,
  User,
  Building,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export const LeadPipeline = () => {
  const [pipeline, setPipeline] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'inbound',
    stage: 'new_lead',
    estimatedValue: '',
    notes: '',
  });

  const stages = [
    { key: 'new_lead', label: 'New Lead', color: 'border-t-sky-500' },
    { key: 'contacted', label: 'Contacted', color: 'border-t-indigo-500' },
    { key: 'qualified', label: 'Qualified', color: 'border-t-purple-500' },
    { key: 'proposal_sent', label: 'Proposal Sent', color: 'border-t-amber-500' },
    { key: 'negotiation', label: 'Negotiation', color: 'border-t-teal-500' },
    { key: 'converted', label: 'Converted 🎉', color: 'border-t-emerald-500' },
    { key: 'lost', label: 'Lost', color: 'border-t-rose-500' },
  ];

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/leads');
      if (res.data.success) {
        setLeads(res.data.data);
        setPipeline(res.data.pipeline);
      }
    } catch (err) {
      toast.error('Failed to load leads pipeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/leads', {
        ...formData,
        estimatedValue: Number(formData.estimatedValue) || 0,
      });
      if (res.data.success) {
        toast.success(`Lead ${res.data.data.name} added!`);
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          source: 'inbound',
          stage: 'new_lead',
          estimatedValue: '',
          notes: '',
        });
        fetchLeads();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating lead');
    }
  };

  const handleStageChange = async (leadId, newStage) => {
    try {
      const res = await api.patch(`/leads/${leadId}/stage`, { stage: newStage });
      if (res.data.success) {
        toast.success(`Stage updated to ${newStage.replace('_', ' ')}`);
        fetchLeads();
      }
    } catch (err) {
      toast.error('Failed to move stage');
    }
  };

  const handleConvertLead = async (leadId, leadName) => {
    if (!window.confirm(`Convert lead "${leadName}" into a full CRM customer?`)) return;
    try {
      const res = await api.post(`/leads/${leadId}/convert`);
      if (res.data.success) {
        toast.success(`🎉 Lead successfully converted to customer ${res.data.data.customer.name}!`);
        fetchLeads();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Conversion failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Sales Pipeline & Leads
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track deal progression from prospect qualification to paying customer conversion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded-xl flex text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'kanban' ? 'bg-white dark:bg-slate-900 shadow-xs text-teal-600' : 'text-slate-500'
              }`}
            >
              Kanban Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === 'list' ? 'bg-white dark:bg-slate-900 shadow-xs text-teal-600' : 'text-slate-500'
              }`}
            >
              List View
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-6 min-h-[600px]">
          {stages.map((stage) => {
            const columnData = pipeline.find((p) => p.stage === stage.key) || { count: 0, totalValue: 0, leads: [] };
            return (
              <div
                key={stage.key}
                className="w-72 shrink-0 flex flex-col bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl p-3 border border-slate-200 dark:border-slate-800"
              >
                {/* Column Header */}
                <div className={`p-3 bg-white dark:bg-slate-900 rounded-xl shadow-xs border-t-4 ${stage.color} mb-3`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {stage.label}
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {columnData.count}
                    </span>
                  </div>
                  <p className="text-[11px] font-extrabold text-teal-600 dark:text-teal-400 mt-1">
                    ${columnData.totalValue?.toLocaleString()}
                  </p>
                </div>

                {/* Cards in Column */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {columnData.leads?.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      Empty stage
                    </div>
                  ) : (
                    columnData.leads.map((lead) => (
                      <Card
                        key={lead._id}
                        className="p-3.5 bg-white dark:bg-slate-900 hover:border-teal-500/50 shadow-xs space-y-2.5 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[170px]">
                              {lead.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate">{lead.company || lead.email}</p>
                          </div>
                          <span className="font-extrabold text-xs text-teal-600 shrink-0">
                            ${lead.estimatedValue?.toLocaleString()}
                          </span>
                        </div>

                        {lead.notes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                            "{lead.notes}"
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 capitalize">{lead.source}</span>

                          {stage.key !== 'converted' ? (
                            <button
                              onClick={() => handleConvertLead(lead._id, lead.name)}
                              className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold hover:bg-emerald-100 transition"
                            >
                              Convert →
                            </button>
                          ) : (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Customer
                            </span>
                          )}
                        </div>

                        {/* Quick Move Select */}
                        {stage.key !== 'converted' && (
                          <select
                            value={lead.stage}
                            onChange={(e) => handleStageChange(lead._id, e.target.value)}
                            className="w-full text-[10px] p-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                          >
                            <option value="new_lead">Move: New Lead</option>
                            <option value="contacted">Move: Contacted</option>
                            <option value="qualified">Move: Qualified</option>
                            <option value="proposal_sent">Move: Proposal Sent</option>
                            <option value="negotiation">Move: Negotiation</option>
                            <option value="lost">Move: Lost</option>
                          </select>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Lead Name</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Est. Value</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Convert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leads.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold">{l.name}</td>
                    <td className="py-3 px-4 text-slate-500">{l.company || '—'}</td>
                    <td className="py-3 px-4">
                      <Badge variant="primary">{l.stage.replace('_', ' ')}</Badge>
                    </td>
                    <td className="py-3 px-4 font-bold text-teal-600">${l.estimatedValue?.toLocaleString()}</td>
                    <td className="py-3 px-4 capitalize text-slate-500">{l.source}</td>
                    <td className="py-3 px-4 text-right">
                      {l.stage !== 'converted' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleConvertLead(l._id, l.name)}
                        >
                          Convert to Customer
                        </Button>
                      ) : (
                        <span className="text-emerald-600 font-bold">Converted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Lead Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Sales Lead">
        <form onSubmit={handleCreateLead} className="space-y-4">
          <Input
            label="Lead Name *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Fenil Patel"
          />
          <Input
            label="Email Address *"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="fenil@cloudcraft.dev"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 555-0199"
            />
            <Input
              label="Company Name"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="CloudCraft AI"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Estimated Deal Value ($)"
              type="number"
              value={formData.estimatedValue}
              onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
              placeholder="15000"
            />
            <Select
              label="Initial Stage"
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
            >
              <option value="new_lead">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="negotiation">Negotiation</option>
            </Select>
          </div>
          <Input
            label="Deal Notes & Context"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="High intent enterprise customer evaluating Professional tier..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
