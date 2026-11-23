import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle,
  MessageCircle,
  Building,
  User,
  Send,
  MoreVertical,
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { toast } from 'sonner';

const PRIORITY_BADGES = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  high: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  urgent: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold',
};

const STATUS_BADGES = {
  open: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  in_progress: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  waiting: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  resolved: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  closed: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-500',
};

export const TicketList = () => {
  const [tickets, setTickets] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, open: 0, inProgress: 0, waiting: 0, resolved: 0, urgent: 0 });
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    customerId: '',
    priority: 'medium',
    category: 'general',
  });

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;

      const [res, metricRes, custRes] = await Promise.all([
        api.get('/tickets', { params }),
        api.get('/tickets/metrics'),
        api.get('/customers?limit=100'),
      ]);

      setTickets(res.data.data || []);
      setMetrics(metricRes.data.data || {});
      setCustomers(custRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter, priorityFilter]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.description || !formData.customerId) {
      toast.error('Subject, description, and customer are required.');
      return;
    }

    try {
      await api.post('/tickets', formData);
      toast.success('Ticket created successfully');
      setIsModalOpen(false);
      setFormData({
        subject: '',
        description: '',
        customerId: '',
        priority: 'medium',
        category: 'general',
      });
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket.');
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeTicket) return;

    try {
      const res = await api.post(`/tickets/${activeTicket._id}/messages`, {
        content: replyMessage.trim(),
      });
      toast.success('Reply submitted');
      setReplyMessage('');
      setActiveTicket(res.data.data);
      fetchTickets();
    } catch (err) {
      toast.error('Failed to send reply.');
    }
  };

  const handleStatusUpdate = async (ticketId, newStatus) => {
    try {
      await api.put(`/tickets/${ticketId}`, { status: newStatus });
      toast.success(`Ticket marked as ${newStatus}`);
      if (activeTicket && activeTicket._id === ticketId) {
        setActiveTicket({ ...activeTicket, status: newStatus });
      }
      fetchTickets();
    } catch (err) {
      toast.error('Failed to update ticket status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <LifeBuoy className="w-7 h-7 text-teal-600" />
            Support Tickets & Service Desk
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Resolve customer inquiries, handle escalations, and monitor SLA compliance.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Plus className="w-4 h-4" />
          Create Ticket
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Tickets</p>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{metrics.total || 0}</p>
        </Card>
        <Card className="p-3.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-bold text-emerald-600 uppercase">Open</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{metrics.open || 0}</p>
        </Card>
        <Card className="p-3.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-bold text-sky-600 uppercase">In Progress</p>
          <p className="text-xl font-extrabold text-sky-600 mt-1">{metrics.inProgress || 0}</p>
        </Card>
        <Card className="p-3.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-bold text-rose-600 uppercase">Urgent SLA</p>
          <p className="text-xl font-extrabold text-rose-600 mt-1">{metrics.urgent || 0}</p>
        </Card>
        <Card className="p-3.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Resolved</p>
          <p className="text-xl font-extrabold text-slate-600 dark:text-slate-400 mt-1">{metrics.resolved || 0}</p>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket # or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </Card>

      {/* Tickets Table */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Ticket #</th>
                <th className="px-6 py-3.5">Subject & Category</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Priority</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Assigned To</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading support tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    No tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t._id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => setActiveTicket(t)}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-xs text-teal-600">
                      {t.ticketNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {t.subject}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">
                        {t.category} • {t.messages?.length || 1} msg{(t.messages?.length || 1) > 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {t.customerId?.name || 'Customer'}
                      </div>
                      {t.customerId?.company && (
                        <div className="text-xs text-slate-400">{t.customerId.company}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`text-xs capitalize ${PRIORITY_BADGES[t.priority] || ''}`}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`text-xs capitalize ${STATUS_BADGES[t.status] || ''}`}>
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {t.assignedTo?.name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTicket(t);
                        }}
                      >
                        View & Reply
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Ticket Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Open Support Ticket"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
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
              placeholder="e.g. API webhook failure on renewal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent SLA</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              >
                <option value="general">General</option>
                <option value="billing">Billing & Invoices</option>
                <option value="technical">Technical Support</option>
                <option value="feature_request">Feature Request</option>
                <option value="onboarding">Onboarding</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Initial Issue Description *
            </label>
            <textarea
              required
              rows="4"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              placeholder="Describe the issue reported by the customer..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
              Create Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ticket Detail & Thread Modal */}
      {activeTicket && (
        <Modal
          isOpen={Boolean(activeTicket)}
          onClose={() => setActiveTicket(null)}
          title={`Ticket ${activeTicket.ticketNumber}: ${activeTicket.subject}`}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Badge className={PRIORITY_BADGES[activeTicket.priority]}>
                  {activeTicket.priority.toUpperCase()}
                </Badge>
                <Badge className={STATUS_BADGES[activeTicket.status]}>
                  {activeTicket.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <span className="text-slate-500">Customer: {activeTicket.customerId?.name}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {activeTicket.status !== 'resolved' && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7"
                    onClick={() => handleStatusUpdate(activeTicket._id, 'resolved')}
                  >
                    Mark Resolved
                  </Button>
                )}
                {activeTicket.status !== 'closed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => handleStatusUpdate(activeTicket._id, 'closed')}
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>

            {/* Conversation Thread */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto p-2">
              {activeTicket.messages?.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-sm border ${
                    msg.senderType === 'customer'
                      ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mr-8'
                      : 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900 ml-8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {msg.senderName || (msg.senderType === 'customer' ? 'Customer' : 'Support Agent')}
                    </span>
                    <span className="text-slate-400">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </div>

            {/* Send Reply Form */}
            <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <input
                type="text"
                placeholder="Type your response or status update..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              />
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5">
                <Send className="w-4 h-4" />
                Reply
              </Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TicketList;
