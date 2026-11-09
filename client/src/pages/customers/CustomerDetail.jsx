import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import {
  User,
  Building,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  FileText,
  Clock,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Download,
  Plus,
  Play,
  Pause,
  XCircle,
  ArrowUpRight,
  Send,
  Copy,
  ChevronLeft,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [isLogInteractionOpen, setIsLogInteractionOpen] = useState(false);
  const [isCreateSubOpen, setIsCreateSubOpen] = useState(false);
  const [isUpgradeSubOpen, setIsUpgradeSubOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);

  // Forms
  const [interactionForm, setInteractionForm] = useState({
    interactionType: 'note',
    subject: '',
    description: '',
    nextFollowUpDate: '',
  });

  const [subForm, setSubForm] = useState({
    planId: '',
    billingFrequency: 'monthly',
  });

  // AI Suite States
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiChurnData, setAiChurnData] = useState(null);
  const [aiSummaryData, setAiSummaryData] = useState(null);
  const [aiUpsellData, setAiUpsellData] = useState(null);
  const [messageDraft, setMessageDraft] = useState({
    type: 'follow_up',
    subject: '',
    body: '',
  });
  const [draftingMessage, setDraftingMessage] = useState(false);

  const fetchCustomerProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/customers/${id}`);
      if (response.data.success) {
        setCustomerData(response.data.data);
      }
    } catch (err) {
      toast.error('Failed to load customer profile');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/plans');
      if (res.data.success) {
        setAvailablePlans(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCustomerProfile();
    fetchPlans();
  }, [id]);

  // Handle Log Interaction
  const handleLogInteraction = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/customers/${id}/interactions`, interactionForm);
      if (res.data.success) {
        toast.success('Interaction logged to timeline.');
        setIsLogInteractionOpen(false);
        setInteractionForm({ interactionType: 'note', subject: '', description: '', nextFollowUpDate: '' });
        fetchCustomerProfile();
      }
    } catch (err) {
      toast.error('Failed to save interaction');
    }
  };

  // Subscription Actions
  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/subscriptions', {
        customerId: id,
        planId: subForm.planId,
        billingFrequency: subForm.billingFrequency,
      });
      if (res.data.success) {
        toast.success('Subscription activated successfully!');
        setIsCreateSubOpen(false);
        fetchCustomerProfile();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating subscription');
    }
  };

  const handlePauseSub = async (subId) => {
    const reason = prompt('Reason for pausing subscription:');
    if (reason === null) return;
    try {
      await api.post(`/subscriptions/${subId}/pause`, { reason });
      toast.success('Subscription paused.');
      fetchCustomerProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to pause');
    }
  };

  const handleResumeSub = async (subId) => {
    try {
      await api.post(`/subscriptions/${subId}/resume`);
      toast.success('Subscription resumed and active.');
      fetchCustomerProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resume');
    }
  };

  const handleCancelSub = async (subId) => {
    const reason = prompt('Reason for cancellation:');
    if (reason === null) return;
    try {
      await api.post(`/subscriptions/${subId}/cancel`, { reason });
      toast.success('Subscription cancelled.');
      fetchCustomerProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleUpgradeSub = async (e) => {
    e.preventDefault();
    const activeSub = customerData?.activeSubscription;
    if (!activeSub) return;

    try {
      await api.post(`/subscriptions/${activeSub._id}/upgrade`, {
        newPlanId: subForm.planId,
        newBillingFrequency: subForm.billingFrequency,
      });
      toast.success('Subscription successfully upgraded/updated!');
      setIsUpgradeSubOpen(false);
      fetchCustomerProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update subscription');
    }
  };

  // Trigger AI Churn Analysis
  const runAiChurnAnalysis = async () => {
    setAiAnalyzing(true);
    try {
      const res = await api.post(`/insights/analyze/${id}`);
      if (res.data.success) {
        setAiChurnData(res.data.data);
        toast.success('AI Churn Analysis completed!');
        fetchCustomerProfile();
      }
    } catch (e) {
      toast.error('AI Churn analysis failed');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Trigger AI Customer Summary
  const runAiSummary = async () => {
    try {
      const res = await api.post(`/insights/customer-summary/${id}`);
      if (res.data.success) {
        setAiSummaryData(res.data.data);
        toast.success('360 AI Summary synthesized!');
      }
    } catch (e) {
      toast.error('Summary generation failed');
    }
  };

  // Trigger AI Upsell Suggestions
  const runAiUpsell = async () => {
    try {
      const res = await api.get(`/insights/recommendations?customerId=${id}`);
      if (res.data.success) {
        setAiUpsellData(res.data.data);
        toast.success('AI Upsell opportunities generated!');
      }
    } catch (e) {
      toast.error('Upsell analysis failed');
    }
  };

  // Trigger AI Email / Message Generator
  const generateOutreachMessage = async (msgType) => {
    setDraftingMessage(true);
    try {
      const res = await api.post(`/insights/generate-message/${id}`, {
        messageType: msgType,
      });
      if (res.data.success) {
        setMessageDraft({
          type: msgType,
          subject: res.data.data.subject,
          body: res.data.data.body,
        });
        toast.success('Personalized email drafted!');
      }
    } catch (e) {
      toast.error('Failed to generate message draft');
    } finally {
      setDraftingMessage(false);
    }
  };

  const copyDraftToClipboard = () => {
    const fullText = `Subject: ${messageDraft.subject}\n\n${messageDraft.body}`;
    navigator.clipboard.writeText(fullText);
    toast.success('Draft copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const { customer, activeSubscription, subscriptions, financialOverview, payments, invoices, timeline } =
    customerData || {};

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            to="/customers"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                {customer?.name}
              </h1>
              <Badge
                variant={
                  customer?.lifecycleStatus === 'customer'
                    ? 'success'
                    : customer?.lifecycleStatus === 'churned'
                    ? 'danger'
                    : 'default'
                }
              >
                {customer?.lifecycleStatus}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {customer?.company || 'Individual Account'} • Customer since{' '}
              {new Date(customer?.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setIsLogInteractionOpen(true)}>
            <Plus className="w-4 h-4" />
            Log Interaction
          </Button>

          {!activeSubscription ? (
            <Button variant="primary" size="sm" onClick={() => setIsCreateSubOpen(true)}>
              <CreditCard className="w-4 h-4" />
              Assign Subscription
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSubForm({
                  planId: activeSubscription.planId?._id,
                  billingFrequency: activeSubscription.billingFrequency,
                });
                setIsUpgradeSubOpen(true);
              }}
            >
              <TrendingUp className="w-4 h-4" />
              Upgrade / Modify Plan
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setActiveTab('ai');
              runAiChurnAnalysis();
            }}
          >
            <Sparkles className="w-4 h-4" />
            Run AI Radar
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'overview', label: '1. Overview & Account' },
          { id: 'subscription', label: '2. Subscriptions' },
          { id: 'timeline', label: '3. Interaction Timeline' },
          { id: 'financial', label: '4. Financials & Invoices' },
          { id: 'ai', label: '5. AI Intelligence Suite ⚡' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Full Name</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{customer?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Email</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{customer?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Phone</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{customer?.phone || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Company</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{customer?.company || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Acquisition Source</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{customer?.source}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Assigned Relationship Manager</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {customer?.assignedTo?.name || 'Unassigned'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-400 block">Billing Address</span>
              <p className="font-medium text-slate-700 dark:text-slate-300 mt-1">
                {customer?.address?.street
                  ? `${customer.address.street}, ${customer.address.city}, ${customer.address.state} ${customer.address.zipCode}, ${customer.address.country}`
                  : 'No address specified'}
              </p>
            </div>

            {customer?.notes && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 block">Account Notes</span>
                <p className="font-medium text-slate-700 dark:text-slate-300 mt-1 italic">
                  "{customer.notes}"
                </p>
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
              Financial Snapshot
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Recognized Revenue:</span>
                <span className="font-extrabold text-teal-600 text-sm">
                  ${(financialOverview?.totalRevenue || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Outstanding Balance:</span>
                <span
                  className={`font-bold ${
                    (financialOverview?.outstandingPayments || 0) > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  ${(financialOverview?.outstandingPayments || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Paid Invoices:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {financialOverview?.paidInvoicesCount || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Overdue Invoices:</span>
                <span className="font-semibold text-rose-500">
                  {financialOverview?.overdueInvoicesCount || 0}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: SUBSCRIPTIONS */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {activeSubscription ? (
            <Card className="p-6 border-l-4 border-l-teal-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {activeSubscription.planId?.name}
                    </h3>
                    <Badge variant={activeSubscription.status === 'active' ? 'success' : 'warning'}>
                      {activeSubscription.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    ${activeSubscription.amount} billed {activeSubscription.billingFrequency}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeSubscription.status === 'active' ? (
                    <Button variant="outline" size="sm" onClick={() => handlePauseSub(activeSubscription._id)}>
                      <Pause className="w-4 h-4 text-amber-500" />
                      Pause Subscription
                    </Button>
                  ) : activeSubscription.status === 'paused' ? (
                    <Button variant="outline" size="sm" onClick={() => handleResumeSub(activeSubscription._id)}>
                      <Play className="w-4 h-4 text-emerald-500" />
                      Resume Subscription
                    </Button>
                  ) : null}

                  <Button variant="outline" size="sm" onClick={() => handleCancelSub(activeSubscription._id)}>
                    <XCircle className="w-4 h-4 text-rose-500" />
                    Cancel Subscription
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block">Start Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(activeSubscription.startDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Next Renewal</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(activeSubscription.nextRenewalDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Billing Status</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {activeSubscription.paymentStatus}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">MRR Contribution</span>
                  <span className="font-extrabold text-teal-600">
                    ${activeSubscription.billingFrequency === 'annual' ? (activeSubscription.amount / 12).toFixed(2) : activeSubscription.amount.toFixed(2)}/mo
                  </span>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="text-center py-10">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Active Subscription</p>
              <p className="text-xs text-slate-400 mt-1">This customer does not have an ongoing recurring plan.</p>
              <Button variant="primary" size="sm" className="mt-4" onClick={() => setIsCreateSubOpen(true)}>
                Assign Plan Now
              </Button>
            </Card>
          )}

          {/* Historical Subscriptions Table */}
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Subscription History
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Plan</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Start Date</th>
                    <th className="py-2.5 px-4">Cancellation / End</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subscriptions?.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold">{s.planId?.name}</td>
                      <td className="py-3 px-4 font-semibold">${s.amount} ({s.billingFrequency})</td>
                      <td className="py-3 px-4">
                        <Badge variant={s.status === 'active' ? 'success' : s.status === 'cancelled' ? 'danger' : 'default'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{new Date(s.startDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {s.cancelledAt ? new Date(s.cancelledAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: INTERACTION TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Customer Interaction History</h3>
            <Button variant="primary" size="sm" onClick={() => setIsLogInteractionOpen(true)}>
              <Plus className="w-4 h-4" />
              Log New Touchpoint
            </Button>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {timeline?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6">No interactions recorded yet.</p>
            ) : (
              timeline?.map((item) => (
                <div key={item._id} className="relative group">
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-teal-600 border-2 border-white dark:border-slate-900" />
                  <Card className="p-4 ml-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Badge variant="primary" className="text-[10px] py-0 uppercase">
                          {item.interactionType}
                        </Badge>
                        {item.subject}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.interactionDate).toLocaleDateString()}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line mt-1">
                        {item.description}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2">
                      Logged by {item.userId?.name || 'Team member'}
                    </p>
                  </Card>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIALS & INVOICES */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Invoices & Billing History
              </h4>
              <Link to="/invoices">
                <Button variant="outline" size="sm">
                  View All Invoices
                </Button>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Issue Date</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4">Total</th>
                    <th className="py-2.5 px-4">Balance Due</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No invoices generated for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    invoices?.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-teal-600">{inv.invoiceNumber}</td>
                        <td className="py-3 px-4 text-slate-500">{new Date(inv.issueDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-semibold">${inv.total.toFixed(2)}</td>
                        <td className="py-3 px-4 font-bold text-rose-600">
                          ${inv.balanceDue.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={inv.status === 'paid' ? 'success' : 'danger'}>
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/invoices/${inv._id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-semibold"
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                          </a>
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

      {/* TAB 5: AI INTELLIGENCE SUITE */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* Action Trigger Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 p-4 bg-gradient-to-r from-teal-900/10 to-emerald-900/10 rounded-2xl border border-teal-500/20">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  AI Customer Intelligence Hub
                </h3>
                <p className="text-xs text-slate-500">
                  Transparent churn risk heuristics, smart upsell detection, 360 summary, and outreach drafter.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={runAiSummary}>
                Generate 360 Summary
              </Button>
              <Button variant="outline" size="sm" onClick={runAiUpsell}>
                Detect Upsells
              </Button>
              <Button variant="primary" size="sm" isLoading={aiAnalyzing} onClick={runAiChurnAnalysis}>
                Recalculate Churn Risk
              </Button>
            </div>
          </div>

          {/* Section A: Churn Prediction Box */}
          <Card className="border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Churn Risk Score & Explanation
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Model: Transparent Heuristic Engine
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-3xl font-black text-rose-600">
                  {aiChurnData?.riskScore || 25}/100
                </span>
                <Badge
                  variant={
                    (aiChurnData?.riskLevel || 'Low') === 'High'
                      ? 'danger'
                      : (aiChurnData?.riskLevel || 'Low') === 'Medium'
                      ? 'warning'
                      : 'success'
                  }
                  className="mt-2 text-xs"
                >
                  {aiChurnData?.riskLevel || 'Low'} Risk Level
                </Badge>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  Calculated from overdue balance, interaction recency, and renewal proximity.
                </p>
              </div>

              <div className="md:col-span-2 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                    Risk Assessment Explanation:
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
                    {aiChurnData?.explanation ||
                      'Customer has consistent payments and recent team check-ins. Churn likelihood is currently bounded in the low risk tier.'}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                    Key Risk Factors:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                    {(aiChurnData?.riskFactors || ['Regular team interactions logged', 'Current subscription in paid status']).map(
                      (f, idx) => (
                        <li key={idx}>{f}</li>
                      )
                    )}
                  </ul>
                </div>

                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                    Recommended Retention Actions:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-teal-700 dark:text-teal-400 font-medium">
                    {(aiChurnData?.recommendedActions || ['Maintain standard relationship check-in cadence']).map(
                      (a, idx) => (
                        <li key={idx}>{a}</li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* Section B: 360 Customer Summary */}
          {aiSummaryData && (
            <Card className="border-l-4 border-l-teal-500">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                AI Executive Account Summary
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                {aiSummaryData.summary}
              </p>
            </Card>
          )}

          {/* Section C: Upsell & Cross-Sell Opportunities */}
          {aiUpsellData?.upsellOptions?.length > 0 && (
            <Card className="border-l-4 border-l-emerald-500">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                Smart Upsell & Expansion Opportunities
              </h4>
              <div className="space-y-3">
                {aiUpsellData.upsellOptions.map((opt, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {opt.recommendedPlan}
                        </span>
                        <Badge variant="success">Priority: {opt.priority}</Badge>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">{opt.reason}</p>
                      <p className="text-teal-600 dark:text-teal-400 mt-1 italic">
                        Pitch: {opt.communicationPitch}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-600">
                        +${opt.potentialAdditionalRevenue}
                      </span>
                      <p className="text-[10px] text-slate-400">{opt.suggestedTiming}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Section D: AI Outreach Message Generator */}
          <Card className="border-l-4 border-l-sky-500">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
              AI Follow-up & Communication Generator
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Select an outreach goal to generate a ready-to-edit message tailored to {customer?.name}. Messages are never sent automatically.
            </p>

            <div className="flex items-center gap-2 flex-wrap mb-4">
              {[
                { type: 'follow_up', label: 'General Follow-up' },
                { type: 'payment_reminder', label: 'Overdue Payment Reminder' },
                { type: 'renewal_reminder', label: 'Subscription Renewal' },
                { type: 'upgrade_proposal', label: 'Plan Upgrade Pitch' },
                { type: 'retention', label: 'Customer Retention Check-in' },
              ].map((btn) => (
                <button
                  key={btn.type}
                  onClick={() => generateOutreachMessage(btn.type)}
                  disabled={draftingMessage}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-xs font-semibold hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 transition"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {messageDraft.subject && (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Subject Line:
                  </span>
                  <Button variant="ghost" size="sm" onClick={copyDraftToClipboard}>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Draft
                  </Button>
                </div>
                <input
                  type="text"
                  value={messageDraft.subject}
                  onChange={(e) => setMessageDraft({ ...messageDraft, subject: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                />
                <textarea
                  rows={6}
                  value={messageDraft.body}
                  onChange={(e) => setMessageDraft({ ...messageDraft, body: e.target.value })}
                  className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans leading-relaxed"
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Log Interaction Modal */}
      <Modal
        isOpen={isLogInteractionOpen}
        onClose={() => setIsLogInteractionOpen(false)}
        title="Log Customer Interaction"
      >
        <form onSubmit={handleLogInteraction} className="space-y-4">
          <Select
            label="Interaction Type"
            value={interactionForm.interactionType}
            onChange={(e) => setInteractionForm({ ...interactionForm, interactionType: e.target.value })}
          >
            <option value="call">Phone Call</option>
            <option value="email">Email</option>
            <option value="meeting">Video / In-Person Meeting</option>
            <option value="note">Internal Note</option>
            <option value="follow_up">Scheduled Follow-up</option>
          </Select>

          <Input
            label="Subject *"
            required
            value={interactionForm.subject}
            onChange={(e) => setInteractionForm({ ...interactionForm, subject: e.target.value })}
            placeholder="e.g. Q4 Growth Check-in"
          />

          <div className="w-full">
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              Description / Minutes
            </label>
            <textarea
              rows={4}
              value={interactionForm.description}
              onChange={(e) => setInteractionForm({ ...interactionForm, description: e.target.value })}
              className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              placeholder="Key notes, customer sentiment, decisions..."
            />
          </div>

          <Input
            label="Next Follow-up Due Date"
            type="date"
            value={interactionForm.nextFollowUpDate}
            onChange={(e) => setInteractionForm({ ...interactionForm, nextFollowUpDate: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsLogInteractionOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Log to Timeline
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Subscription Modal */}
      <Modal
        isOpen={isCreateSubOpen}
        onClose={() => setIsCreateSubOpen(false)}
        title="Assign Subscription Plan"
      >
        <form onSubmit={handleCreateSubscription} className="space-y-4">
          <Select
            label="Select Subscription Plan *"
            required
            value={subForm.planId}
            onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}
          >
            <option value="">-- Choose a Plan --</option>
            {availablePlans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} (${p.pricing?.monthly}/mo - ${p.pricing?.annual}/yr)
              </option>
            ))}
          </Select>

          <Select
            label="Billing Frequency"
            value={subForm.billingFrequency}
            onChange={(e) => setSubForm({ ...subForm, billingFrequency: e.target.value })}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="semi_annual">Semi-Annual</option>
            <option value="annual">Annual</option>
          </Select>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateSubOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Activate Subscription
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upgrade / Modify Plan Modal */}
      <Modal
        isOpen={isUpgradeSubOpen}
        onClose={() => setIsUpgradeSubOpen(false)}
        title="Upgrade / Modify Subscription Plan"
      >
        <form onSubmit={handleUpgradeSub} className="space-y-4">
          <Select
            label="Target Subscription Plan *"
            required
            value={subForm.planId}
            onChange={(e) => setSubForm({ ...subForm, planId: e.target.value })}
          >
            {availablePlans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} (${p.pricing?.monthly}/mo)
              </option>
            ))}
          </Select>

          <Select
            label="Billing Frequency"
            value={subForm.billingFrequency}
            onChange={(e) => setSubForm({ ...subForm, billingFrequency: e.target.value })}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="semi_annual">Semi-Annual</option>
            <option value="annual">Annual</option>
          </Select>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsUpgradeSubOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Plan Transition
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
