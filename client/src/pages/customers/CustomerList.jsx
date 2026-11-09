import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Trash2,
  Edit,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Building,
  Mail,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';

export const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [lifecycleStatus, setLifecycleStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'website',
    lifecycleStatus: 'customer',
    notes: '',
  });

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Import State
  const [importJsonText, setImportJsonText] = useState('');

  const fetchCustomers = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        search,
        lifecycleStatus,
        sortBy,
        sortOrder,
      };
      const response = await api.get('/customers', { params });
      if (response.data.success) {
        setCustomers(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, [search, lifecycleStatus, sortBy, sortOrder]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/customers', formData);
      if (res.data.success) {
        toast.success(`Customer ${res.data.data.name} added successfully!`);
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          source: 'website',
          lifecycleStatus: 'customer',
          notes: '',
        });
        fetchCustomers(1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating customer');
    }
  };

  const handleEditCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch(`/customers/${selectedCustomer._id}`, formData);
      if (res.data.success) {
        toast.success('Customer updated successfully!');
        setIsEditModalOpen(false);
        fetchCustomers(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating customer');
    }
  };

  const handleDeleteCustomer = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"? This will archive their records.`)) {
      return;
    }
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer successfully archived.');
      fetchCustomers(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting customer');
    }
  };

  const handleBulkAction = async (action, extraData = {}) => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Perform ${action} on ${selectedIds.length} customer(s)?`)) return;

    try {
      const res = await api.post('/customers/bulk', { action, ids: selectedIds, data: extraData });
      toast.success(res.data.message);
      setSelectedIds([]);
      fetchCustomers(pagination.page);
    } catch (err) {
      toast.error('Bulk action failed');
    }
  };

  const handleExportCsv = () => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/customers?exportFormat=csv`;
    window.open(url, '_blank');
  };

  const handleImportCustomers = async (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array of customer objects.');

      const res = await api.post('/customers/import', { customers: parsed });
      toast.success(res.data.message);
      setIsImportModalOpen(false);
      setImportJsonText('');
      fetchCustomers(1);
    } catch (err) {
      toast.error(err.message || 'Invalid JSON format');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const openEditModal = (c) => {
    setSelectedCustomer(c);
    setFormData({
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      company: c.company || '',
      source: c.source || 'website',
      lifecycleStatus: c.lifecycleStatus || 'customer',
      notes: c.notes || '',
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your customer base, recurring subscriptions, and AI churn intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="w-4 h-4" />
            Import
          </Button>

          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <select
              value={lifecycleStatus}
              onChange={(e) => setLifecycleStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Lifecycle Statuses</option>
              <option value="customer">Active Customer</option>
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="churned">Churned</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>

            {/* Bulk Actions Menu */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-1.5 p-1 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 px-2">
                  {selectedIds.length} Selected
                </span>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition"
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Customer Data Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={customers.length > 0 && selectedIds.length === customers.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                </th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Lifecycle Status</th>
                <th className="py-3 px-4">Active Subscription</th>
                <th className="py-3 px-4">AI Churn Risk</th>
                <th className="py-3 px-4">Assigned To</th>
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
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No customers found matching the criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c._id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c._id)}
                        onChange={() => toggleSelectOne(c._id)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/customers/${c._id}`}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 flex items-center gap-1.5"
                      >
                        {c.name}
                        <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                      </Link>
                      <p className="text-[11px] text-slate-400">{c.email}</p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {c.company || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          c.lifecycleStatus === 'customer'
                            ? 'success'
                            : c.lifecycleStatus === 'lead'
                            ? 'info'
                            : c.lifecycleStatus === 'churned'
                            ? 'danger'
                            : 'default'
                        }
                      >
                        {c.lifecycleStatus}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.subscription ? (
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {c.subscription.planName}
                          </span>
                          <p className="text-[11px] text-teal-600 dark:text-teal-400">
                            ${c.subscription.mrr?.toFixed(2)}/mo MRR
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No Subscription</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.churnRisk ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.churnRisk.level === 'High'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : c.churnRisk.level === 'Medium'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          {c.churnRisk.level} ({c.churnRisk.score})
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unanalyzed</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {c.assignedTo?.name || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit Customer"
                        onClick={() => openEditModal(c)}
                      >
                        <Edit className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete Customer"
                        onClick={() => handleDeleteCustomer(c._id, c.name)}
                      >
                        <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-700" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing Page <b>{pagination.page}</b> of <b>{pagination.totalPages || 1}</b> ({pagination.total} total customers)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchCustomers(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchCustomers(pagination.page + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Customer"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Input
            label="Customer Full Name *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Sarah Connor"
          />
          <Input
            label="Email Address *"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="sarah@skynetlabs.io"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 555-0192"
            />
            <Input
              label="Company Name"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Cyberdyne Systems"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Acquisition Source"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            >
              <option value="website">Website Direct</option>
              <option value="referral">Referral</option>
              <option value="inbound">Inbound Sales</option>
              <option value="cold_outreach">Cold Outreach</option>
              <option value="advertising">Paid Ads</option>
              <option value="partner">Partner</option>
            </Select>

            <Select
              label="Lifecycle Status"
              value={formData.lifecycleStatus}
              onChange={(e) => setFormData({ ...formData, lifecycleStatus: e.target.value })}
            >
              <option value="customer">Active Customer</option>
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <Input
            label="Internal Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Key account details or special requirements..."
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit ${selectedCustomer?.name || 'Customer'}`}
      >
        <form onSubmit={handleEditCustomer} className="space-y-4">
          <Input
            label="Customer Full Name *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email Address *"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Company Name"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Acquisition Source"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            >
              <option value="website">Website Direct</option>
              <option value="referral">Referral</option>
              <option value="inbound">Inbound Sales</option>
              <option value="cold_outreach">Cold Outreach</option>
              <option value="advertising">Paid Ads</option>
              <option value="partner">Partner</option>
            </Select>

            <Select
              label="Lifecycle Status"
              value={formData.lifecycleStatus}
              onChange={(e) => setFormData({ ...formData, lifecycleStatus: e.target.value })}
            >
              <option value="customer">Active Customer</option>
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="churned">Churned</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <Input
            label="Internal Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* CSV / JSON Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Customers (JSON Array)"
      >
        <form onSubmit={handleImportCustomers} className="space-y-4">
          <p className="text-xs text-slate-500">
            Paste a JSON array of customer objects. Each item must have at least <code>name</code> and <code>email</code>.
          </p>
          <textarea
            rows={8}
            className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder={`[\n  {\n    "name": "Jane Doe",\n    "email": "jane@techcorp.io",\n    "company": "TechCorp",\n    "phone": "+1 555-0100"\n  }\n]`}
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Execute Import
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
