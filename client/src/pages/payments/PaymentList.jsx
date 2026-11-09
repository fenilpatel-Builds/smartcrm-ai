import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import {
  Receipt,
  Plus,
  Download,
  Search,
  Filter,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export const PaymentList = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);

  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    currency: 'USD',
    paymentMethod: 'credit_card',
    transactionReference: '',
    status: 'paid',
    notes: '',
  });

  const fetchPayments = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/payments', {
        params: {
          page,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
      });
      if (res.data.success) {
        setPayments(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers', { params: { limit: 100 } });
      if (res.data.success) setCustomers(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPayments(1);
    fetchCustomers();
  }, [statusFilter]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/payments', {
        ...formData,
        amount: Number(formData.amount),
      });
      if (res.data.success) {
        toast.success('Payment recorded successfully!');
        setIsRecordModalOpen(false);
        setFormData({
          customerId: '',
          amount: '',
          currency: 'USD',
          paymentMethod: 'credit_card',
          transactionReference: '',
          status: 'paid',
          notes: '',
        });
        fetchPayments(1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error recording payment');
    }
  };

  const handleExportCsv = () => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/payments?exportFormat=csv`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Payment Transactions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete transaction history, settlement receipts, payment method breakdowns, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsRecordModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Filter Transactions:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid (Collected)</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed / Past Due</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </Card>

      {/* Payments Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="p-4">
                      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {p.transactionReference}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/customers/${p.customerId?._id}`}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600"
                      >
                        {p.customerId?.name}
                      </Link>
                      <p className="text-[11px] text-slate-400">{p.customerId?.company}</p>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-slate-100">
                      ${p.amount.toFixed(2)} {p.currency}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600 dark:text-slate-400">
                      {p.paymentMethod?.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          p.status === 'paid'
                            ? 'success'
                            : p.status === 'pending'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {p.status}
                      </Badge>
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
            Showing Page <b>{pagination.page}</b> of <b>{pagination.totalPages || 1}</b> ({pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchPayments(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchPayments(pagination.page + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Payment Transaction"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Select
            label="Customer *"
            required
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
          >
            <option value="">-- Select Customer --</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.company ? `(${c.company})` : ''}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount ($) *"
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="149.00"
            />
            <Select
              label="Payment Method"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            >
              <option value="credit_card">Credit Card</option>
              <option value="bank_transfer">ACH / Bank Transfer</option>
              <option value="stripe">Stripe</option>
              <option value="razorpay">Razorpay</option>
              <option value="paypal">PayPal</option>
              <option value="cash">Cash / Check</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Transaction Reference"
              value={formData.transactionReference}
              onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
              placeholder="e.g. TXN-12903"
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="paid">Paid (Confirmed)</option>
              <option value="pending">Pending Settlement</option>
              <option value="failed">Failed</option>
            </Select>
          </div>

          <Input
            label="Internal Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Payment memo or gateway authorization ID..."
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsRecordModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Record Transaction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
