import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Mail,
  PhoneCall,
  Calendar,
  FileText,
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { toast } from 'sonner';

const TYPE_ICONS = {
  email: Mail,
  call: PhoneCall,
  meeting: Calendar,
  note: FileText,
  status_change: UserCheck,
};

const TYPE_COLORS = {
  email: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  call: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  meeting: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  note: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  status_change: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
};

export const CommunicationHub = () => {
  const [logs, setLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    interactionType: 'email',
    subject: '',
    description: '',
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter !== 'all') params.interactionType = typeFilter;

      const [logRes, custRes] = await Promise.all([
        api.get('/interactions', { params }),
        api.get('/customers?limit=100'),
      ]);

      setLogs(logRes.data.data || []);
      setCustomers(custRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load communication feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [typeFilter]);

  const handleCreateLog = async (e) => {
    e.preventDefault();
    if (!formData.customerId || !formData.subject || !formData.description) {
      toast.error('Customer, subject, and description are required.');
      return;
    }

    try {
      await api.post(`/customers/${formData.customerId}/interactions`, {
        interactionType: formData.interactionType,
        subject: formData.subject,
        description: formData.description,
      });

      toast.success('Activity logged successfully');
      setIsModalOpen(false);
      setFormData({
        customerId: '',
        interactionType: 'email',
        subject: '',
        description: '',
      });
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log activity.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-teal-600" />
            Communication & Touchpoints Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Omnichannel customer communication logs, correspondence history, and rep interactions.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Plus className="w-4 h-4" />
          Log Communication
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap gap-2 items-center">
        {['all', 'email', 'call', 'meeting', 'note', 'status_change'].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
              typeFilter === t
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </Card>

      {/* Activity Timeline Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading communication logs...
          </div>
        ) : logs.length === 0 ? (
          <Card className="p-12 text-center text-slate-400 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            No interactions logged for this filter.
          </Card>
        ) : (
          logs.map((log) => {
            const Icon = TYPE_ICONS[log.interactionType] || FileText;
            const colorClass = TYPE_COLORS[log.interactionType] || 'bg-slate-100 text-slate-700';

            return (
              <Card
                key={log._id}
                className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {log.subject}
                      </h3>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(log.interactionDate || log.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                        {log.customerId?.name || 'Customer Account'}
                      </span>
                      {log.customerId?.company && (
                        <span className="text-xs text-slate-400">
                          • {log.customerId.company}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        • Logged by {log.userId?.name || 'User'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {log.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal to Log Activity */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Customer Communication"
      >
        <form onSubmit={handleCreateLog} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Customer Account *
            </label>
            <select
              required
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
            >
              <option value="">Select a Customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.company ? `(${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Channel / Type *
              </label>
              <select
                value={formData.interactionType}
                onChange={(e) => setFormData({ ...formData, interactionType: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              >
                <option value="email">Email</option>
                <option value="call">Phone Call</option>
                <option value="meeting">Meeting / Demo</option>
                <option value="note">Internal Note</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject *
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                placeholder="e.g. Q4 Contract Negotiation Call"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Communication Details & Notes *
            </label>
            <textarea
              required
              rows="4"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              placeholder="What was discussed, objections raised, agreed action items..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              Save Log
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CommunicationHub;
