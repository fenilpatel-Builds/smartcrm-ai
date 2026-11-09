import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { Settings as SettingsIcon, Users, Building, ShieldCheck, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

export const Settings = () => {
  const { user, organization, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('organization');

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
    role: 'employee',
  });

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

  useEffect(() => {
    fetchMembers();
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
        setInviteForm({ name: '', email: '', role: 'employee' });
        fetchMembers();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Workspace Settings & Governance
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure organization business details, billing currencies, tax rates, and team role permissions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('organization')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'organization'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Organization Profile & Billing
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'team'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Team & RBAC ({members.length})
        </button>
      </div>

      {/* ORGANIZATION PROFILE TAB */}
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
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="INR">INR (₹)</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Invoice Prefix"
                value={orgForm.invoicePrefix}
                onChange={(e) => setOrgForm({ ...orgForm, invoicePrefix: e.target.value })}
                placeholder="INV"
              />
              <Input
                label="Standard Tax Rate (%)"
                type="number"
                step="0.1"
                value={orgForm.taxRate}
                onChange={(e) => setOrgForm({ ...orgForm, taxRate: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button type="submit" variant="primary" isLoading={savingOrg}>
                Save Organization Settings
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TEAM MANAGEMENT & RBAC TAB */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Workspace Members & Role Permissions
              </h3>
              <p className="text-xs text-slate-500">
                Manage roles (Owner, Manager, Employee) and control tenant data access boundaries.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsInviteModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Invite Team Member
            </Button>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Update Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {members.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {m.name} {m._id === user?._id && '(You)'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{m.email}</td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            m.role === 'owner' || m.role === 'super_admin'
                              ? 'primary'
                              : m.role === 'manager'
                              ? 'info'
                              : 'default'
                          }
                        >
                          {m.role?.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {m.lastLogin ? new Date(m.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {m._id !== user?._id && user?.role === 'owner' ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m._id, e.target.value)}
                            className="p-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                          >
                            <option value="owner">Owner</option>
                            <option value="manager">Manager</option>
                            <option value="employee">Employee</option>
                          </select>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Default</span>
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
            <option value="employee">Employee (Manages assigned accounts & logs)</option>
            <option value="manager">Manager (Oversees team analytics & pipeline)</option>
            <option value="owner">Organization Owner (Full workspace administrative access)</option>
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
    </div>
  );
};
