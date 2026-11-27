import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  CreditCard,
  FileText,
  ShieldCheck,
  LifeBuoy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Building,
  Mail,
  Phone,
  Send,
  Loader2,
  ExternalLink,
  Receipt,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ClientPortal() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);
  const [error, setError] = useState(null);

  // Support ticket form state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketPriority, setTicketPriority] = useState('medium');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Payment state
  const [payingInvoiceId, setPayingInvoiceId] = useState(null);

  const fetchPortal = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5001/api/v1/portal/view/${token}`);
      if (res.data.success) {
        setPortalData(res.data.portal);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired customer portal access link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPortal();
    }
  }, [token]);

  const handlePayInvoice = async (invoice) => {
    try {
      setPayingInvoiceId(invoice._id);

      // 1. Create order
      const orderRes = await axios.post(`http://localhost:5001/api/v1/portal/pay-invoice/${token}`, {
        invoiceId: invoice._id,
      });

      if (!orderRes.data.success) {
        throw new Error(orderRes.data.message || 'Order creation failed');
      }

      const { order } = orderRes.data;

      // 2. Simulate or handle Razorpay checkout
      toast.info('Initializing secure payment gateway...');

      // Simulated instant payment for testing & sandbox mode
      setTimeout(async () => {
        try {
          const verifyRes = await axios.post(`http://localhost:5001/api/v1/portal/verify-payment/${token}`, {
            invoiceId: invoice._id,
            orderId: order.orderId,
            paymentId: `pay_portal_${Date.now()}`,
            signature: 'simulated_valid_portal_sig',
          });

          if (verifyRes.data.success) {
            toast.success(`Payment of $${invoice.balanceDue.toFixed(2)} completed successfully!`);
            fetchPortal();
          }
        } catch (vErr) {
          toast.error(vErr.response?.data?.message || 'Payment verification failed');
        } finally {
          setPayingInvoiceId(null);
        }
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Payment processing failed');
      setPayingInvoiceId(null);
    }
  };

  const handleDownloadPdf = (invoiceId, invoiceNumber) => {
    window.open(`http://localhost:5001/api/v1/invoices/${invoiceId}/pdf`, '_blank');
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) {
      toast.error('Please enter a subject and message.');
      return;
    }

    try {
      setSubmittingTicket(true);
      const res = await axios.post(`http://localhost:5001/api/v1/portal/support-ticket/${token}`, {
        subject: ticketSubject,
        message: ticketMessage,
        priority: ticketPriority,
      });

      if (res.data.success) {
        toast.success(`Ticket ${res.data.ticket.ticketNumber} created successfully! Our team will respond shortly.`);
        setTicketSubject('');
        setTicketMessage('');
        fetchPortal();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit support ticket.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-slate-400 font-medium">Securing client portal session...</p>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-white">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Portal Access Link Expired</h2>
          <p className="text-slate-400 mb-6">{error || 'This link is no longer valid or has expired.'}</p>
          <p className="text-xs text-slate-500">
            Please contact your account executive or support representative to request a new secure access link.
          </p>
        </div>
      </div>
    );
  }

  const { customer, organization, subscriptions = [], invoices = [], payments = [], tickets = [], documents = [] } = portalData;
  const pendingInvoices = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue');
  const totalBalanceDue = pendingInvoices.reduce((sum, i) => sum + (i.balanceDue || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              {organization?.name ? organization.name.charAt(0) : 'S'}
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">{organization?.name || 'Customer Portal'}</h1>
              <p className="text-xs text-slate-400">Client Self-Service & Billing Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Authenticated Session
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Welcome & Balance Banner */}
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Welcome Back</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{customer?.name}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
              {customer?.company && (
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  {customer.company}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {customer.email}
              </span>
              {customer?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {customer.phone}
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl p-4 sm:p-5 w-full sm:w-auto min-w-[220px]">
            <p className="text-xs font-medium text-slate-400 mb-1">Total Outstanding Balance</p>
            <p className={`text-2xl sm:text-3xl font-black ${totalBalanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              ${totalBalanceDue.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {pendingInvoices.length} pending invoice{pendingInvoices.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Active Subscriptions Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
              Active Subscription Services
            </h3>
          </div>

          {subscriptions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              No active subscription service found. Contact support for assistance.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscriptions.map((sub) => (
                <div key={sub._id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-white text-base">{sub.planId?.name || 'Enterprise Service'}</h4>
                      <p className="text-xs text-slate-400 capitalize">{sub.billingFrequency} Billing</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {sub.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-2xl font-black text-white">${sub.amount?.toFixed(2)}</span>
                    <span className="text-xs text-slate-400">/ {sub.billingFrequency}</span>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1.5 border-t border-slate-800 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Period End:</span>
                      <span className="font-medium text-slate-300">
                        {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Next Scheduled Renewal:</span>
                      <span className="font-medium text-slate-300">
                        {sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Invoices & Payment Table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Invoices & Billing History
            </h3>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Invoice #</th>
                    <th className="px-5 py-3.5">Issue Date</th>
                    <th className="px-5 py-3.5">Due Date</th>
                    <th className="px-5 py-3.5">Total</th>
                    <th className="px-5 py-3.5">Balance Due</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-8 text-center text-slate-500">
                        No billing invoices recorded yet.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => {
                      const isPending = inv.balanceDue > 0;
                      return (
                        <tr key={inv._id} className="hover:bg-slate-800/40 transition">
                          <td className="px-5 py-4 font-mono font-semibold text-white">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-5 py-4 text-slate-400">
                            {new Date(inv.issueDate).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4 text-slate-400">
                            {new Date(inv.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4 font-medium text-white">
                            ${inv.total?.toFixed(2)}
                          </td>
                          <td className={`px-5 py-4 font-bold ${isPending ? 'text-amber-400' : 'text-slate-400'}`}>
                            ${inv.balanceDue?.toFixed(2)}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              inv.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : inv.status === 'overdue'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right space-x-2">
                            {isPending && (
                              <button
                                onClick={() => handlePayInvoice(inv)}
                                disabled={payingInvoiceId === inv._id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50"
                              >
                                {payingInvoiceId === inv._id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-3.5 h-3.5" />
                                    Pay Now
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadPdf(inv._id, inv.invoiceNumber)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                              title="Download PDF Invoice"
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Support Tickets Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submit New Ticket */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-purple-400" />
              Need Assistance?
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Submit a support inquiry directly to your account management team.
            </p>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="e.g. Question regarding billing schedule"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="low">Low - General Inquiry</option>
                  <option value="medium">Medium - Account Request</option>
                  <option value="high">High - Urgent Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Detailed Message</label>
                <textarea
                  rows="4"
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Describe your request or question in detail..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingTicket}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition shadow-md disabled:opacity-50"
              >
                {submittingTicket ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Past Tickets List */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Support History & Requests
            </h3>

            {tickets.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No past support tickets found. Your requests will appear here once submitted.
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t._id} className="border border-slate-800 bg-slate-950/60 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <span className="font-mono text-xs text-blue-400 font-semibold">{t.ticketNumber}</span>
                        <h4 className="font-bold text-white text-sm">{t.subject}</h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        t.status === 'resolved' || t.status === 'closed'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    {t.messages && t.messages.length > 0 && (
                      <p className="text-xs text-slate-400 line-clamp-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                        {t.messages[t.messages.length - 1].content}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                      <span>Submitted: {new Date(t.createdAt).toLocaleDateString()}</span>
                      <span className="capitalize">Priority: {t.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 text-center text-xs text-slate-600">
        Powered by {organization?.name || 'SmartCRM'} &bull; Secure 256-bit Encrypted Customer Portal &bull; All Rights Reserved.
      </footer>
    </div>
  );
}
