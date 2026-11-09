import { Payment } from '../../models/Payment.js';
import { Invoice } from '../../models/Invoice.js';
import { Subscription } from '../../models/Subscription.js';
import { logAudit } from '../audit/auditService.js';

export const recordPayment = async ({
  organizationId,
  customerId,
  subscriptionId,
  invoiceId,
  amount,
  currency = 'USD',
  paymentMethod = 'credit_card',
  transactionReference,
  status = 'paid',
  paidAt = new Date(),
  notes = '',
  userId,
}) => {
  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const payment = await Payment.create({
    organizationId,
    customerId,
    subscriptionId,
    invoiceId,
    amount,
    currency,
    paymentMethod,
    transactionReference: transactionReference || `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    status,
    paidAt: status === 'paid' ? paidAt : undefined,
    notes,
  });

  // If linked to an invoice and payment is successful, update invoice balance
  if (invoiceId && status === 'paid') {
    const invoice = await Invoice.findOne({ _id: invoiceId, organizationId });
    if (invoice) {
      invoice.amountPaid = (invoice.amountPaid || 0) + amount;
      invoice.balanceDue = Math.max(0, invoice.total - invoice.amountPaid);
      if (invoice.balanceDue === 0) {
        invoice.status = 'paid';
      } else if (invoice.amountPaid > 0) {
        invoice.status = 'partially_paid';
      }
      await invoice.save();
    }
  }

  // If linked to a subscription, update subscription payment status
  if (subscriptionId) {
    const sub = await Subscription.findOne({ _id: subscriptionId, organizationId });
    if (sub) {
      if (status === 'paid') {
        sub.paymentStatus = 'paid';
        if (sub.status === 'past_due') {
          sub.status = 'active';
        }
      } else if (status === 'failed') {
        sub.paymentStatus = 'failed';
        sub.status = 'past_due';
      }
      await sub.save();
    }
  }

  await logAudit({
    organizationId,
    userId,
    action: 'RECORD_PAYMENT',
    entityType: 'Payment',
    entityId: payment._id,
    metadata: { customerId, amount, status, paymentMethod, invoiceId },
  });

  return payment;
};

export const getOverduePayments = async (organizationId) => {
  const overdueInvoices = await Invoice.find({
    organizationId,
    dueDate: { $lt: new Date() },
    status: { $in: ['sent', 'partially_paid', 'overdue'] },
    balanceDue: { $gt: 0 },
  }).populate('customerId', 'name email company phone');

  return overdueInvoices;
};
