import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import {
  Settings as SettingsIcon,
  Users,
  Building,
  CreditCard,
  Mail,
  HardDrive,
  CheckCircle,
  AlertTriangle,
  Send,
  Zap,
  Globe,
  Key,
  Shield,
  Trash2,
  RefreshCw,
  Plus,
  Play,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

export const Settings = () => {
  const { user, organization, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('organization');

  // Webhooks State
  const [webhooks, setWebhooks] = useState([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [isCreateWebhookOpen, setIsCreateWebhookOpen] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    targetUrl: '',
    events: ['deal.won', 'payment.captured'],
  });
  const [createdSecret, setCreatedSecret] = useState('');

  // 2FA Security State
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);

  // Organization Form State
  const [orgForm, setOrgForm] = useState({
    name: '',
    phone: '',
    currency: 'USD',
    timezone: 'America/New_York',
    taxRate: '8.5',
    invoicePrefix: 'INV',
  });
  const [savingOrg, setSavingOrg] = useState(false);

  // Team Members State
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'sales_rep',
  });

  // Integrations State
  const [paymentSettings, setPaymentSettings] = useState({
    provider: 'sandbox',
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    mode: 'test',
    currency: 'INR',
  });
  const [emailSettings, setEmailSettings] = useState({
    provider: 'mock',
    fromName: 'SmartCRM Team',
    fromEmail: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isTestEmailModalOpen, setIsTestEmailModalOpen] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Usage State
  const [usageData, setUsageData] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    if (organization) {
      setOrgForm({
        name: organization.name || '',
        phone: organization.phone || '',
        currency: organization.currency || 'USD',
        timezone: organization.timezone || 'America/New_York',
        taxRate: String(organization.settings?.taxRate || 0),
        invoicePrefix: organization.settings?.invoicePrefix || 'INV',
      });
    }
  }, [organization]);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await api.get('/organizations/members');
      if (res.data.success) {
        setMembers(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchIntegrations = async () => {
    try {
      const [payRes, emailRes] = await Promise.all([
        api.get('/payments/config'),
        api.get('/communications/settings'),
      ]);
      if (payRes.data.success) {
        setPaymentSettings((prev) => ({
          ...prev,
          provider: payRes.data.data.provider || 'sandbox',
          keyId: payRes.data.data.keyId || '',
          mode: payRes.data.data.mode || 'test',
          currency: payRes.data.data.currency || 'INR',
        }));
      }
      if (emailRes.data.success) {
        setEmailSettings((prev) => ({
          ...prev,
          ...emailRes.data.data,
        }));
      }
    } catch (e) {
      console.error('Failed to fetch integration settings:', e);
    }
  };

  const fetchUsage = async () => {
    setLoadingUsage(true);
    try {
      const res = await api.get('/organizations/usage');
      if (res.data.success) {
        setUsageData(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch usage metrics:', e);
    } finally {
      setLoadingUsage(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchIntegrations();
    fetchUsage();
  }, []);

  const handleSaveOrganization = async (e) => {
    e.preventDefault();
    setSavingOrg(true);
    try {
      const res = await api.patch('/organizations/current', {
        name: orgForm.name,
        phone: orgForm.phone,
        currency: orgForm.currency,
        timezone: orgForm.timezone,
        settings: {
          taxRate: Number(orgForm.taxRate),
          invoicePrefix: orgForm.invoicePrefix,
        },
      });

      if (res.data.success) {
        toast.success('Organization settings updated!');
        refreshUser();
      }
    } catch (err) {
      toast.error('Failed to update organization');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/organizations/invite', inviteForm);
      if (res.data.success) {
        toast.success(`Team member ${inviteForm.name} invited! Default password: WelcomeSmartCRM2026!`);
        setIsInviteModalOpen(false);
        setInviteForm({ name: '', email: '', role: 'sales_rep' });
        fetchMembers();
        fetchUsage();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error inviting member');
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.patch(`/organizations/members/${memberId}/role`, { role: newRole });
      toast.success('Role updated.');
      fetchMembers();
    } catch (e) {
      toast.error('Failed to update role');
    }
  };

  const handleSavePaymentSettings = async (e) => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      const res = await api.post('/payments/settings', paymentSettings);
      if (res.data.success) {
        toast.success('Payment gateway configuration saved!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save payment gateway settings.');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSaveEmailSettings = async (e) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const res = await api.post('/communications/settings', emailSettings);
      if (res.data.success) {
        toast.success('Email transport settings saved!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save email settings.');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setSendingTestEmail(true);
    try {
      const res = await api.post('/communications/test', {
        recipientEmail: testEmailRecipient || user?.email,
      });
      if (res.data.success) {
        toast.success(`Test email dispatched to ${testEmailRecipient || user?.email}!`);
        setIsTestEmailModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch test email.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      setLoadingWebhooks(true);
      const res = await api.get('/webhooks');
      if (res.data.success) {
        setWebhooks(res.data.webhooks);
      }
    } catch (err) {
      console.error('Failed to load webhooks', err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'webhooks') {
      fetchWebhooks();
    }
  }, [activeTab]);

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/webhooks', webhookForm);
      if (res.data.success) {
        toast.success('Webhook created successfully!');
        setCreatedSecret(res.data.webhook.secretKey);
        fetchWebhooks();
        setWebhookForm({ name: '', targetUrl: '', events: ['deal.won', 'payment.captured'] });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create webhook');
    }
  };

  const handleDeleteWebhook = async (id) => {
    if (!window.confirm('Are you sure you want to delete this webhook subscription?')) return;
    try {
      await api.delete(`/webhooks/${id}`);
      toast.success('Webhook deleted');
      fetchWebhooks();
    } catch (err) {
      toast.error('Failed to delete webhook');
    }
  };

  const handleTestWebhook = async (id) => {
    try {
      toast.info('Dispatching test webhook payload...');
      const res = await api.post(`/webhooks/${id}/test`);
      if (res.data.success) {
        toast.success('Test webhook delivered successfully!');
        fetchWebhooks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test delivery failed');
    }
  };

  const handleStart2FA = async () => {
    try {
      const res = await api.post('/auth/2fa/setup');
      if (res.data.success) {
        setTwoFactorData(res.data);
        setTwoFactorModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to initiate 2FA setup');
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setVerifying2FA(true);
    try {
      const res = await api.post('/auth/2fa/verify', { code: twoFactorCode });
      if (res.data.success) {
        toast.success('2FA successfully enabled for your account!');
        setTwoFactorModalOpen(false);
        setTwoFactorCode('');
        refreshUser();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    const password = window.prompt('Enter your account password to confirm disabling 2FA:');
    if (!password) return;
    try {
      const res = await api.post('/auth/2fa/disable', { password });
      if (res.data.success) {
        toast.success('Two-factor authentication disabled.');
        refreshUser();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disable 2FA');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Workspace Settings & Governance
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure organization business profile, payment gateways, email transports, team RBAC, and SaaS plan limits.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('organization')}
          className={`px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'organization'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Organization Profile
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'team'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Team & RBAC ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'integrations'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Integrations & Gateways
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'usage'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          SaaS Plan & Usage Limits
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'webhooks'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Webhooks & API ({webhooks.length})
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'security'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Security & 2FA
        </button>
      </div>

      {/* 1. ORGANIZATION PROFILE TAB */}
      {activeTab === 'organization' && (
        <Card className="max-w-2xl">
          <form onSubmit={handleSaveOrganization} className="space-y-4">
            <Input
              label="Organization Legal / Trading Name *"
              required
              value={orgForm.name}
              onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Primary Support Phone"
                value={orgForm.phone}
                onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
              />
              <Select
                label="Operating Currency"
                value={orgForm.currency}
                onChange={(e) => setOrgForm({ ...orgForm, currency: e.target.value })}
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Timezone"
                value={orgForm.timezone}
                onChange={(e) => setOrgForm({ ...orgForm, timezone: e.target.value })}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </Select>

              <Input
                label="Invoice Identifier Prefix"
                value={orgForm.invoicePrefix}
                onChange={(e) => setOrgForm({ ...orgForm, invoicePrefix: e.target.value })}
                placeholder="INV"
              />
            </div>

            <Input
              label="Default Sales Tax / VAT Rate (%)"
              type="number"
              step="0.01"
              value={orgForm.taxRate}
              onChange={(e) => setOrgForm({ ...orgForm, taxRate: e.target.value })}
            />

            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary" loading={savingOrg}>
                Save Organization Settings
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 2. TEAM & RBAC TAB */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Assigned Team Members ({members.length})
            </h2>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsInviteModalOpen(true)}
            >
              Invite Team Member
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Work Email</th>
                    <th className="py-3 px-4">Enterprise Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {members.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {m.name}
                      </td>
                      <td className="py-3.5 px-4">{m.email}</td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            m.role === 'owner' || m.role === 'super_admin'
                              ? 'primary'
                              : m.role?.includes('manager')
                              ? 'info'
                              : 'default'
                          }
                        >
                          {m.role?.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${m.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {m.isActive !== false ? 'Active' : 'Suspended'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {m._id !== user?._id && (user?.role === 'owner' || user?.role === 'super_admin' || user?.role === 'org_admin') ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m._id, e.target.value)}
                            className="p-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                          >
                            <option value="owner">Owner</option>
                            <option value="org_admin">Org Admin</option>
                            <option value="sales_manager">Sales Manager</option>
                            <option value="sales_rep">Sales Rep</option>
                            <option value="finance_manager">Finance Manager</option>
                            <option value="support_agent">Support Agent</option>
                            <option value="employee">Employee</option>
                            <option value="viewer">Viewer (Read-Only)</option>
                          </select>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Primary</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 3. INTEGRATIONS & GATEWAYS TAB */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Razorpay / Stripe Payment Gateway */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Payment Gateway Integration
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Connect Razorpay or Stripe to accept real customer card, UPI, net banking, or international payments.
            </p>

            <form onSubmit={handleSavePaymentSettings} className="space-y-4">
              <Select
                label="Payment Provider"
                value={paymentSettings.provider}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, provider: e.target.value })}
              >
                <option value="sandbox">Sandbox / Local Simulation (Development)</option>
                <option value="razorpay">Razorpay (India & Global - Cards, UPI, Netbanking)</option>
                <option value="stripe">Stripe (Global Credit Cards & ACH)</option>
              </Select>

              {paymentSettings.provider !== 'sandbox' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Environment Mode"
                      value={paymentSettings.mode}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, mode: e.target.value })}
                    >
                      <option value="test">Test / Sandbox Mode</option>
                      <option value="live">Live Production Mode</option>
                    </Select>

                    <Select
                      label="Settlement Currency"
                      value={paymentSettings.currency}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, currency: e.target.value })}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </Select>
                  </div>

                  <Input
                    label="Public Key / Key ID"
                    value={paymentSettings.keyId}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, keyId: e.target.value })}
                    placeholder="rzp_test_..."
                  />

                  <Input
                    label="Secret Key"
                    type="password"
                    value={paymentSettings.keySecret}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, keySecret: e.target.value })}
                    placeholder="••••••••••••••••"
                  />

                  <Input
                    label="Webhook Signing Secret"
                    value={paymentSettings.webhookSecret}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, webhookSecret: e.target.value })}
                    placeholder="whsec_..."
                  />
                </>
              )}

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" loading={savingPayment}>
                  Save Gateway Settings
                </Button>
              </div>
            </form>
          </Card>

          {/* Outgoing Email Integration */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Outgoing Email Service
                </h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsTestEmailModalOpen(true)}
              >
                Send Test Email
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Configure SMTP or Resend to deliver onboarding emails, invoices, and renewal alerts to real customer inboxes.
            </p>

            <form onSubmit={handleSaveEmailSettings} className="space-y-4">
              <Select
                label="Email Transport Provider"
                value={emailSettings.provider}
                onChange={(e) => setEmailSettings({ ...emailSettings, provider: e.target.value })}
              >
                <option value="mock">Mock / Simulation (Logs to Database)</option>
                <option value="smtp">Standard SMTP Server (Gmail, SendGrid, Amazon SES)</option>
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="From Name"
                  value={emailSettings.fromName}
                  onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                  placeholder="SmartCRM Support"
                />
                <Input
                  label="From Email Address"
                  type="email"
                  value={emailSettings.fromEmail}
                  onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                  placeholder="noreply@yourcompany.com"
                />
              </div>

              {emailSettings.provider === 'smtp' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Input
                        label="SMTP Host"
                        value={emailSettings.smtpHost}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <Input
                      label="Port"
                      type="number"
                      value={String(emailSettings.smtpPort)}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: Number(e.target.value) })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="SMTP Username"
                      value={emailSettings.smtpUser}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                    />
                    <Input
                      label="SMTP Password / App Key"
                      type="password"
                      value={emailSettings.smtpPassword}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end">
                <Button type="submit" variant="primary" loading={savingEmail}>
                  Save Email Settings
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 4. SAAS PLAN & USAGE LIMITS TAB */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current SaaS Subscription</span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                    {usageData?.planName || 'Enterprise SaaS Tier'}
                  </h2>
                  <Badge variant="primary">ACTIVE PLAN</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info('Custom enterprise plan active with full limits.')}>
                Compare SaaS Plans
              </Button>
            </div>

            {/* Usage Metrics Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
              {/* Users */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Team Seats</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {usageData?.usage?.users?.current || members.length} / {usageData?.usage?.users?.limit || 25}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all"
                    style={{ width: `${usageData?.usage?.users?.percent || 20}%` }}
                  />
                </div>
              </div>

              {/* Customers */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Customer Accounts</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {usageData?.usage?.customers?.current || 0} / {usageData?.usage?.customers?.limit || 500}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${usageData?.usage?.customers?.percent || 10}%` }}
                  />
                </div>
              </div>

              {/* Contacts */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Contacts</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {usageData?.usage?.contacts?.current || 0} / {usageData?.usage?.contacts?.limit || 1000}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${usageData?.usage?.contacts?.percent || 5}%` }}
                  />
                </div>
              </div>

              {/* Deals */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Active Deals</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {usageData?.usage?.deals?.current || 0} / {usageData?.usage?.deals?.limit || 200}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${usageData?.usage?.deals?.percent || 8}%` }}
                  />
                </div>
              </div>

              {/* Storage */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Document Storage</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {usageData?.usage?.storage?.currentMB || 0} MB / {usageData?.usage?.storage?.limitMB || 1024} MB
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${usageData?.usage?.storage?.percent || 2}%` }}
                  />
                </div>
              </div>

              {/* Emails */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-700 dark:text-slate-300">Monthly Emails</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {usageData?.usage?.emails?.sentThisMonth || 0} / {usageData?.usage?.emails?.allowance || 2000}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-2 rounded-full transition-all"
                    style={{ width: `${usageData?.usage?.emails?.percent || 4}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 5. WEBHOOKS & API TAB */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-teal-600" />
                  Outbound Webhook Subscriptions
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Deliver signed HTTP POST payloads to Slack, Zapier, Make, or custom endpoints in real-time when CRM events trigger.
                </p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setIsCreateWebhookOpen(true)}>
                <Plus className="w-4 h-4" />
                Register Webhook
              </Button>
            </div>

            {createdSecret && (
              <div className="mb-6 p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
                <div className="flex items-center gap-2 font-bold text-teal-800 dark:text-teal-300 mb-1">
                  <Key className="w-4 h-4" />
                  Webhook Signing Secret Generated
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-2">
                  Save this secret key now. It is used to verify the <code>X-SmartCRM-Signature</code> HMAC-SHA256 header.
                </p>
                <code className="block p-2 bg-white dark:bg-slate-900 rounded-lg border border-teal-300 dark:border-teal-700 font-mono text-teal-600 dark:text-teal-400 select-all">
                  {createdSecret}
                </code>
              </div>
            )}

            {loadingWebhooks ? (
              <div className="text-center py-12 text-slate-400 text-xs">Loading webhooks...</div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Globe className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Active Webhook Subscriptions</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Connect your CRM events to external workflows like Slack alerts, Zapier automations, or your backend microservices.
                </p>
                <Button variant="outline" size="sm" onClick={() => setIsCreateWebhookOpen(true)}>
                  Create Your First Webhook
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((wh) => (
                  <div
                    key={wh._id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{wh.name}</span>
                        <Badge variant={wh.isActive ? 'success' : 'danger'}>
                          {wh.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                        {wh.lastStatusCode && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            wh.lastStatusCode < 300 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-100 text-red-800'
                          }`}>
                            HTTP {wh.lastStatusCode}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-slate-500 truncate max-w-md">{wh.targetUrl}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {wh.events?.map((ev) => (
                          <span
                            key={ev}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button variant="outline" size="xs" onClick={() => handleTestWebhook(wh._id)}>
                        <Play className="w-3.5 h-3.5 text-teal-600" />
                        Test
                      </Button>
                      <Button variant="outline" size="xs" onClick={() => handleDeleteWebhook(wh._id)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 6. SECURITY & 2FA TAB */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card className="max-w-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-600" />
                  Two-Factor Authentication (2FA / TOTP)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enforce cryptographic time-based one-time password verification on login via Google Authenticator, Authy, or 1Password.
                </p>
              </div>
              <Badge variant={user?.twoFactorEnabled ? 'success' : 'default'}>
                {user?.twoFactorEnabled ? '2FA Active' : '2FA Disabled'}
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${user?.twoFactorEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {user?.twoFactorEnabled ? 'Your account is secured with 2FA' : 'Two-Factor Authentication is currently off'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {user?.twoFactorEnabled
                      ? 'Every login requires your standard password and a 6-digit TOTP verification code.'
                      : 'We recommend turning on 2FA to prevent unauthorized workspace access.'}
                  </p>
                </div>
              </div>
            </div>

            {user?.twoFactorEnabled ? (
              <Button variant="outline" onClick={handleDisable2FA} className="text-red-500 hover:text-red-600">
                Disable Two-Factor Authentication
              </Button>
            ) : (
              <Button variant="primary" onClick={handleStart2FA}>
                <Shield className="w-4 h-4" />
                Setup Two-Factor Authentication
              </Button>
            )}
          </Card>
        </div>
      )}

      {/* Create Webhook Modal */}
      <Modal isOpen={isCreateWebhookOpen} onClose={() => setIsCreateWebhookOpen(false)} title="Register Outbound Webhook">
        <form onSubmit={handleCreateWebhook} className="space-y-4">
          <Input
            label="Webhook Name *"
            required
            value={webhookForm.name}
            onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
            placeholder="e.g. Slack Deal Notifications or Zapier Sync"
          />

          <Input
            label="Payload Target URL (HTTPS) *"
            type="url"
            required
            value={webhookForm.targetUrl}
            onChange={(e) => setWebhookForm({ ...webhookForm, targetUrl: e.target.value })}
            placeholder="https://hooks.slack.com/services/... or https://api.mycrm.com/webhooks"
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Subscribed Trigger Events *
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'deal.won', label: 'Deal Won' },
                { id: 'deal.created', label: 'Deal Created' },
                { id: 'customer.created', label: 'Customer Created' },
                { id: 'payment.captured', label: 'Payment Captured' },
                { id: 'invoice.overdue', label: 'Invoice Overdue' },
                { id: 'ticket.created', label: 'Support Ticket Created' },
              ].map((ev) => {
                const checked = webhookForm.events.includes(ev.id);
                return (
                  <label key={ev.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...webhookForm.events, ev.id]
                          : webhookForm.events.filter((x) => x !== ev.id);
                        setWebhookForm({ ...webhookForm, events: next });
                      }}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{ev.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateWebhookOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Webhook
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal isOpen={twoFactorModalOpen} onClose={() => setTwoFactorModalOpen(false)} title="Setup Two-Factor Authentication">
        <form onSubmit={handleVerify2FA} className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Open your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, or 1Password) and enter the secret code below:
          </p>

          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-center">
            <span className="text-xs text-slate-400 block mb-1">Base32 Secret Key</span>
            <code className="text-sm font-bold font-mono tracking-widest text-teal-600 dark:text-teal-400 select-all">
              {twoFactorData?.secret}
            </code>
          </div>

          {twoFactorData?.recoveryCodes && (
            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Emergency Backup Recovery Codes:
              </span>
              <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                {twoFactorData.recoveryCodes.map((c, i) => (
                  <span key={i}>{c}</span>
                ))}
              </div>
            </div>
          )}

          <Input
            label="Enter 6-Digit Authenticator Code *"
            required
            maxLength={6}
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value.trim())}
            placeholder="123456"
            className="text-center font-mono text-lg tracking-widest"
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setTwoFactorModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={verifying2FA}>
              Verify & Enable
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invite Member Modal */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite Team Member">
        <form onSubmit={handleInviteMember} className="space-y-4">
          <Input
            label="Full Name *"
            required
            value={inviteForm.name}
            onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
            placeholder="e.g. Rachel Green"
          />

          <Input
            label="Work Email *"
            type="email"
            required
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            placeholder="rachel@acmesaas.io"
          />

          <Select
            label="Role Assignment *"
            value={inviteForm.role}
            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
          >
            <option value="sales_rep">Sales Representative</option>
            <option value="sales_manager">Sales Manager</option>
            <option value="finance_manager">Finance Manager</option>
            <option value="support_agent">Support Agent</option>
            <option value="employee">Employee</option>
            <option value="viewer">Viewer (Read-Only)</option>
            <option value="org_admin">Organization Administrator</option>
          </Select>

          <p className="text-[11px] text-slate-400">
            A temporary password (<code>WelcomeSmartCRM2026!</code>) will be provisioned for immediate sign-in.
          </p>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Test Email Modal */}
      <Modal isOpen={isTestEmailModalOpen} onClose={() => setIsTestEmailModalOpen(false)} title="Send Diagnostic Test Email">
        <form onSubmit={handleSendTestEmail} className="space-y-4">
          <Input
            label="Recipient Email Address *"
            type="email"
            required
            value={testEmailRecipient}
            onChange={(e) => setTestEmailRecipient(e.target.value)}
            placeholder={user?.email || 'admin@company.com'}
          />
          <p className="text-xs text-slate-500">
            This will immediately trigger an authenticated SMTP handshake and log the delivery receipt in your communication records.
          </p>
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsTestEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={sendingTestEmail}>
              Send Diagnostic Email
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
