import { Payment } from '../../models/Payment.js';
import { Invoice } from '../../models/Invoice.js';
import { Subscription } from '../../models/Subscription.js';
import { logAudit } from '../audit/auditService.js';
import { paymentProvider } from './paymentProvider.js';

export const roundMoney = (num) => Math.round(Number(num) * 100) / 100;

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
  idempotencyKey,
  userId,
}) => {
  const cleanAmount = roundMoney(amount);
  if (cleanAmount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  // If using provider charge workflow or idempotency key
  let providerRef = transactionReference;
  if (idempotencyKey) {
    const charge = await paymentProvider.createCharge({
      amount: cleanAmount,
      currency,
      customerId,
      invoiceId,
      idempotencyKey,
      metadata: { organizationId, subscriptionId },
    });
    providerRef = charge.transactionReference;
  }

  const payment = await Payment.create({
    organizationId,
    customerId,
    subscriptionId,
    invoiceId,
    amount: cleanAmount,
    currency,
    paymentMethod,
    transactionReference: providerRef || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    status,
    paidAt: status === 'paid' ? paidAt : undefined,
    notes,
  });

  // If linked to an invoice and payment is successful, update invoice balance
  if (invoiceId && status === 'paid') {
    const invoice = await Invoice.findOne({ _id: invoiceId, organizationId });
    if (invoice) {
      invoice.amountPaid = roundMoney((invoice.amountPaid || 0) + cleanAmount);
      invoice.balanceDue = roundMoney(Math.max(0, invoice.total - invoice.amountPaid));
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
    metadata: { customerId, amount: cleanAmount, status, paymentMethod, invoiceId },
  });

  return payment;
};

export const handlePaymentWebhook = async ({ payload, signature }) => {
  const isValid = paymentProvider.verifyWebhookSignature(payload, signature);
  if (!isValid) {
    const error = new Error('Invalid payment provider webhook signature.');
    error.statusCode = 401;
    throw error;
  }

  const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const { eventType, data } = event;

  if (eventType === 'charge.succeeded' && data) {
    const { organizationId, customerId, invoiceId, subscriptionId, amount, transactionReference } = data;
    if (organizationId && customerId && amount) {
      return await recordPayment({
        organizationId,
        customerId,
        subscriptionId,
        invoiceId,
        amount,
        paymentMethod: 'provider_webhook',
        transactionReference,
        status: 'paid',
        notes: `Webhook confirmed transaction ${transactionReference}`,
      });
    }
  }

  return { received: true, eventType };
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
