import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import {
  FileText,
  Plus,
  Download,
  Trash2,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [customers, setCustomers] = useState([]);

  // Create Invoice Form State
  const [customerId, setCustomerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ description: 'Software Subscription Service', quantity: 1, unitPrice: 149 }]);

  // Record Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');

  const fetchInvoices = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get('/invoices', {
        params: {
          page,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
      });
      if (res.data.success) {
        setInvoices(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (e) {
      toast.error('Failed to load invoices');
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
    fetchInvoices(1);
    fetchCustomers();
  }, [statusFilter]);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }

    try {
      const res = await api.post('/invoices', {
        customerId,
        dueDate,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        notes,
        items,
      });

      if (res.data.success) {
        toast.success(`Invoice ${res.data.data.invoiceNumber} created!`);
        setIsCreateModalOpen(false);
        fetchInvoices(1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      const res = await api.post(`/invoices/${selectedInvoice._id}/record-payment`, {
        amount: Number(paymentAmount),
        paymentMethod,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setIsRecordPaymentModalOpen(false);
        fetchInvoices(pagination.page);
      }
    } catch (err) {
      toast.error('Payment submission failed');
    }
  };

  const calculateSubtotal = () =>
    items.reduce((sum, item) => sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0), 0);

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    const disc = Number(discount) || 0;
    const tx = Number(tax) || 0;
    return Math.max(0, sub - disc + tx);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Invoice Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate itemized billing invoices, download PDF statements, and track customer balance settlements.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Generate Invoice
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Invoices:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Invoices</option>
            <option value="sent">Sent (Pending Payment)</option>
            <option value="paid">Paid in Full</option>
            <option value="overdue">Overdue</option>
            <option value="partially_paid">Partially Paid</option>
          </select>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Balance Due</th>
                <th className="py-3 px-4">Status</th>
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
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No invoices matching filter.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/customers/${inv.customerId?._id}`}
                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600"
                      >
                        {inv.customerId?.name}
                      </Link>
                      <p className="text-[11px] text-slate-400">{inv.customerId?.company}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      ${inv.total.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-black text-rose-600">
                      ${inv.balanceDue.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          inv.status === 'paid'
                            ? 'success'
                            : inv.status === 'sent'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {inv.balanceDue > 0 && (
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setPaymentAmount(String(inv.balanceDue));
                            setIsRecordPaymentModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 hover:bg-teal-100 transition"
                        >
                          Record Payment
                        </button>
                      )}
                      <a
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/invoices/${inv._id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        PDF
                      </a>
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
            Page <b>{pagination.page}</b> of <b>{pagination.totalPages || 1}</b> ({pagination.total} invoices)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchInvoices(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchInvoices(pagination.page + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Generate Customer Invoice"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Billed Customer *"
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.company ? `(${c.company})` : ''}
                </option>
              ))}
            </Select>

            <Input
              label="Payment Due Date *"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Line Items Builder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Line Items
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  className="flex-3 p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  required
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  min="1"
                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  className="w-16 p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center"
                  required
                />
                <input
                  type="number"
                  placeholder="Price"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                  className="w-24 p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-right"
                  required
                />
                <span className="w-20 text-right font-bold text-xs text-slate-700 dark:text-slate-300">
                  ${((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)).toFixed(2)}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-1.5 text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Subtotal & Calculations */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Input
                label="Discount ($)"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
              <Input
                label="Sales Tax / GST ($)"
                type="number"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl flex flex-col justify-center space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Discount:</span>
                <span>-${Number(discount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax:</span>
                <span>+${Number(tax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Total:</span>
                <span className="text-teal-600">${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Input
            label="Payment Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Wire transfer instructions, PO reference..."
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Generate & Issue Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment against Invoice Modal */}
      <Modal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        title={`Apply Payment to ${selectedInvoice?.invoiceNumber}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <p className="text-xs text-slate-500">
            Total Outstanding Balance: <b>${selectedInvoice?.balanceDue.toFixed(2)}</b>
          </p>

          <Input
            label="Payment Amount ($) *"
            type="number"
            step="0.01"
            required
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
          />

          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="credit_card">Credit Card</option>
            <option value="bank_transfer">ACH / Bank Transfer</option>
            <option value="stripe">Stripe</option>
            <option value="razorpay">Razorpay</option>
            <option value="cash">Check / Cash</option>
          </Select>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsRecordPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Apply Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
