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
  Send,
  Eye,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
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
  const [activeTab, setActiveTab] = useState('emails'); // 'emails' | 'activities'

  // Activities state
  const [logs, setLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({
    customerId: '',
    interactionType: 'email',
    subject: '',
    description: '',
  });

  // Emails & Outbox state
  const [emailLogs, setEmailLogs] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [composeForm, setComposeForm] = useState({
    to: '',
    recipientName: '',
    subject: '',
    message: '',
    templateType: 'custom',
  });
  const [previewContent, setPreviewContent] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

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

  const fetchEmailLogs = async () => {
    try {
      setLoadingEmails(true);
      const params = {};
      if (emailStatusFilter !== 'all') params.status = emailStatusFilter;
      const res = await api.get('/communications/logs', { params });
      if (res.data.success) {
        setEmailLogs(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEmails(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'activities') {
      fetchLogs();
    } else {
      fetchEmailLogs();
      if (customers.length === 0) {
        api.get('/customers?limit=100').then((r) => setCustomers(r.data.data || []));
      }
    }
  }, [activeTab, typeFilter, emailStatusFilter]);

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.customerId || !activityForm.subject || !activityForm.description) {
      toast.error('Customer, subject, and description are required.');
      return;
    }

    try {
      await api.post(`/customers/${activityForm.customerId}/interactions`, {
        interactionType: activityForm.interactionType,
        subject: activityForm.subject,
        description: activityForm.description,
      });

      toast.success('Activity logged successfully');
      setIsActivityModalOpen(false);
      setActivityForm({
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

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!composeForm.to || !composeForm.subject) {
      toast.error('Recipient email and subject are required.');
      return;
    }

    setSendingEmail(true);
    try {
      const res = await api.post('/communications/send', {
        to: composeForm.to,
        recipientName: composeForm.recipientName,
        subject: composeForm.subject,
        text: composeForm.message,
        templateType: composeForm.templateType,
        templateData: {
          customerName: composeForm.recipientName,
          message: composeForm.message,
        },
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Email dispatched successfully!');
        setIsComposeModalOpen(false);
        setComposeForm({
          to: '',
          recipientName: '',
          subject: '',
          message: '',
          templateType: 'custom',
        });
        fetchEmailLogs();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePreviewTemplate = async () => {
    try {
      const res = await api.post('/communications/preview', {
        templateType: composeForm.templateType,
        templateData: {
          customerName: composeForm.recipientName || 'Valued Client',
          message: composeForm.message || 'Thank you for partnering with our team.',
          invoiceNumber: 'INV-2026-088',
          amount: '$1,500.00',
          dueDate: '2026-12-15',
          planName: 'Enterprise SaaS',
          renewalDate: '2026-12-30',
        },
      });
      if (res.data.success) {
        setPreviewContent(res.data.data);
        setIsPreviewModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to generate template preview.');
    }
  };

  const handleSelectCustomerForEmail = (custId) => {
    const cust = customers.find((c) => c._id === custId);
    if (cust) {
      setComposeForm((prev) => ({
        ...prev,
        to: cust.email || '',
        recipientName: cust.name || '',
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Communication & Outbound Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dispatch tracked customer emails, preview responsive templates, and maintain omnichannel activity logs.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'emails' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsComposeModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Compose & Send Email
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsActivityModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Log Interaction
            </Button>
          )}
        </div>
      </div>

      {/* Primary Sub-Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('emails')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'emails'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Tracked Email Outbox ({emailLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('activities')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'activities'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          CRM Interaction Feed ({logs.length})
        </button>
      </div>

      {/* 1. EMAILS OUTBOX TAB */}
      {activeTab === 'emails' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {['all', 'sent', 'delivered', 'failed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setEmailStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition ${
                    emailStatusFilter === st
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={fetchEmailLogs} className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Template Type</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Message ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingEmails ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">Loading delivery records...</td>
                    </tr>
                  ) : emailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">No outgoing emails found matching current filter.</td>
                    </tr>
                  ) : (
                    emailLogs.map((e) => (
                      <tr key={e._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {e.recipient?.name || e.recipient?.email}
                          <span className="block text-[11px] font-normal text-slate-400">{e.recipient?.email}</span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {e.subject}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="capitalize text-slate-600 dark:text-slate-300 font-medium">
                            {e.templateType?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              e.status === 'delivered' || e.status === 'sent'
                                ? 'success'
                                : e.status === 'failed' || e.status === 'bounced'
                                ? 'danger'
                                : 'default'
                            }
                          >
                            {e.status?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(e.sentAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[10px] text-slate-400">
                          {e.providerMessageId ? e.providerMessageId.slice(0, 16) + '...' : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 2. CRM ACTIVITY FEED TAB */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {['all', 'email', 'call', 'meeting', 'note'].map((tp) => (
              <button
                key={tp}
                onClick={() => setTypeFilter(tp)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition ${
                  typeFilter === tp
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {tp}
              </button>
            ))}
          </div>

          <Card>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <div className="p-8 text-center text-slate-400">Loading interactions...</div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No interaction records found.</div>
              ) : (
                logs.map((log) => {
                  const Icon = TYPE_ICONS[log.interactionType] || FileText;
                  const colorClass = TYPE_COLORS[log.interactionType] || 'bg-slate-100 text-slate-700';

                  return (
                    <div key={log._id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                      <div className={`p-2 rounded-xl shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {log.subject}
                          </h3>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {new Date(log.interactionDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                          {log.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                          <span>Customer: <strong className="text-slate-700 dark:text-slate-300">{log.customerId?.name || 'General'}</strong></span>
                          <span>Logged by: <strong className="text-slate-700 dark:text-slate-300">{log.userId?.name || 'Team Rep'}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Compose & Send Email Modal */}
      <Modal isOpen={isComposeModalOpen} onClose={() => setIsComposeModalOpen(false)} title="Compose Tracked Email">
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Existing Customer (Optional autofill)
            </label>
            <select
              onChange={(e) => handleSelectCustomerForEmail(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Recipient Name"
              value={composeForm.recipientName}
              onChange={(e) => setComposeForm({ ...composeForm, recipientName: e.target.value })}
              placeholder="e.g. Rachel Green"
            />
            <Input
              label="Recipient Email Address *"
              type="email"
              required
              value={composeForm.to}
              onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })}
              placeholder="rachel@company.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Email Template Type"
              value={composeForm.templateType}
              onChange={(e) => setComposeForm({ ...composeForm, templateType: e.target.value })}
            >
              <option value="custom">Custom Message (Plain / HTML)</option>
              <option value="customer_onboarding">Customer Onboarding / Welcome</option>
              <option value="invoice_notice">Invoice Notification & Payment Link</option>
              <option value="renewal_reminder">Subscription Renewal Reminder</option>
              <option value="payment_failed">Payment Failed Urgent Notice</option>
              <option value="ticket_update">Support Ticket Resolution Notice</option>
            </Select>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-1.5"
                onClick={handlePreviewTemplate}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </Button>
            </div>
          </div>

          <Input
            label="Email Subject Line *"
            required
            value={composeForm.subject}
            onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
            placeholder="e.g. Your Monthly Invoice from Acme Corp"
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Message Body / Notes
            </label>
            <textarea
              rows={4}
              value={composeForm.message}
              onChange={(e) => setComposeForm({ ...composeForm, message: e.target.value })}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="Type message content or custom instructions..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsComposeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={sendingEmail} className="flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Dispatch Email
            </Button>
          </div>
        </form>
      </Modal>

      {/* Template Preview Modal */}
      <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title={`Preview: ${previewContent?.subject || 'Template'}`}>
        <div className="space-y-4">
          <div className="text-xs text-slate-500 border-b pb-2">
            <strong>Subject:</strong> {previewContent?.subject}
          </div>
          <div
            className="border rounded-xl p-4 bg-white max-h-96 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: previewContent?.html || '<p>No preview generated</p>' }}
          />
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setIsPreviewModalOpen(false)}>
              Close Preview
            </Button>
          </div>
        </div>
      </Modal>

      {/* Log Interaction Modal */}
      <Modal isOpen={isActivityModalOpen} onClose={() => setIsActivityModalOpen(false)} title="Log CRM Interaction">
        <form onSubmit={handleCreateActivity} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Customer *
            </label>
            <select
              required
              value={activityForm.customerId}
              onChange={(e) => setActivityForm({ ...activityForm, customerId: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.company || 'Individual'})
                </option>
              ))}
            </select>
          </div>

          <Select
            label="Activity Type"
            value={activityForm.interactionType}
            onChange={(e) => setActivityForm({ ...activityForm, interactionType: e.target.value })}
          >
            <option value="email">Email</option>
            <option value="call">Phone Call</option>
            <option value="meeting">Meeting</option>
            <option value="note">Internal Note</option>
          </Select>

          <Input
            label="Subject *"
            required
            value={activityForm.subject}
            onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
            placeholder="e.g. Q4 Contract Discussion Call"
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Summary / Meeting Notes *
            </label>
            <textarea
              rows={4}
              required
              value={activityForm.description}
              onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              placeholder="Record details of conversation, next steps, commitments..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsActivityModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Activity
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
