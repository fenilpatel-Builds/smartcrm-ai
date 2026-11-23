import { Payment } from '../../models/Payment.js';
import { Invoice } from '../../models/Invoice.js';
import { Subscription } from '../../models/Subscription.js';
import { Organization } from '../../models/Organization.js';
import { logAudit } from '../audit/auditService.js';
import {
  paymentProvider,
  getPaymentProvider,
  getProviderPublicConfig,
  roundMoney,
} from './paymentProvider.js';

export { roundMoney, getProviderPublicConfig };

/**
 * Creates an authorized payment order via the configured payment gateway (Razorpay/Stripe/Sandbox)
 */
export const createPaymentOrder = async ({
  organizationId,
  customerId,
  invoiceId,
  subscriptionId,
  amount,
  currency,
  notes = {},
}) => {
  const org = await Organization.findById(organizationId);
  const provider = getPaymentProvider(org);

  let cleanAmount = amount;
  let targetCurrency = currency || org?.integrations?.payment?.currency || org?.currency || 'INR';

  // If linked to an invoice and amount not specified, use balanceDue
  if (invoiceId && (!cleanAmount || cleanAmount <= 0)) {
    const invoice = await Invoice.findOne({ _id: invoiceId, organizationId });
    if (!invoice) throw new Error('Invoice not found.');
    cleanAmount = invoice.balanceDue;
    if (invoice.currency) targetCurrency = invoice.currency;
  }

  // If linked to subscription and amount not specified, use subscription amount
  if (subscriptionId && (!cleanAmount || cleanAmount <= 0)) {
    const sub = await Subscription.findOne({ _id: subscriptionId, organizationId });
    if (!sub) throw new Error('Subscription not found.');
    cleanAmount = sub.amount;
    if (sub.currency) targetCurrency = sub.currency;
  }

  cleanAmount = roundMoney(cleanAmount);
  if (cleanAmount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const orderResult = await provider.createOrder({
    amount: cleanAmount,
    currency: targetCurrency,
    receipt: invoiceId ? `inv_${invoiceId.toString().slice(-8)}` : `sub_${Date.now().toString().slice(-8)}`,
    notes: {
      organizationId: organizationId.toString(),
      customerId: customerId ? customerId.toString() : '',
      invoiceId: invoiceId ? invoiceId.toString() : '',
      subscriptionId: subscriptionId ? subscriptionId.toString() : '',
      ...notes,
    },
  });

  return {
    ...orderResult,
    keyId: provider.keyId || (provider.providerName === 'razorpay' ? process.env.RAZORPAY_KEY_ID || '' : ''),
    customerId,
    invoiceId,
    subscriptionId,
  };
};

/**
 * Verifies gateway payment signature and records durable payment with reconciliation
 */
export const verifyAndRecordGatewayPayment = async ({
  organizationId,
  customerId,
  invoiceId,
  subscriptionId,
  amount,
  currency,
  orderId,
  paymentId,
  signature,
  idempotencyKey,
  userId,
}) => {
  const org = await Organization.findById(organizationId);
  const provider = getPaymentProvider(org);

  // 1. Verify cryptographic payment signature
  const isValidSignature = provider.verifyPaymentSignature({
    orderId,
    paymentId,
    signature,
  });

  if (!isValidSignature) {
    throw new Error('Cryptographic payment signature verification failed. Possible tampering or forgery.');
  }

  // 2. Prevent duplicate payment processing (Idempotency)
  if (paymentId) {
    const existing = await Payment.findOne({
      organizationId,
      gatewayPaymentId: paymentId,
      status: 'paid',
    });
    if (existing) {
      return { payment: existing, isDuplicate: true };
    }
  }

  const cleanAmount = roundMoney(amount);

  // 3. Record verified payment
  const payment = await Payment.create({
    organizationId,
    customerId,
    subscriptionId: subscriptionId || undefined,
    invoiceId: invoiceId || undefined,
    amount: cleanAmount,
    currency: currency || org?.integrations?.payment?.currency || 'INR',
    paymentMethod: provider.providerName,
    gatewayProvider: provider.providerName,
    gatewayOrderId: orderId,
    gatewayPaymentId: paymentId,
    gatewaySignature: signature,
    transactionReference: paymentId || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'paid',
    paidAt: new Date(),
    idempotencyKey,
    notes: `Verified by gateway (${provider.providerName}) with order ${orderId}`,
  });

  // 4. Reconcile Invoice if linked
  if (invoiceId) {
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

  // 5. Reconcile Subscription if linked
  if (subscriptionId) {
    const sub = await Subscription.findOne({ _id: subscriptionId, organizationId });
    if (sub) {
      sub.paymentStatus = 'paid';
      if (sub.status === 'past_due') {
        sub.status = 'active';
      }
      await sub.save();
    }
  }

  await logAudit({
    organizationId,
    userId,
    action: 'VERIFY_GATEWAY_PAYMENT',
    entityType: 'Payment',
    entityId: payment._id,
    metadata: { orderId, paymentId, amount: cleanAmount, provider: provider.providerName },
  });

  return { payment, isDuplicate: false };
};

/**
 * Standard or manual payment recording
 */
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
    idempotencyKey,
    notes,
  });

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

/**
 * Processes Webhook events from external gateways
 */
export const handlePaymentWebhook = async ({ payload, signature, organizationId }) => {
  let org = null;
  if (organizationId) {
    org = await Organization.findById(organizationId);
  }
  const provider = getPaymentProvider(org);

  const isValid = provider.verifyWebhookSignature(payload, signature);
  if (!isValid) {
    const error = new Error('Invalid payment provider webhook signature.');
    error.statusCode = 401;
    throw error;
  }

  const event = typeof payload === 'string' ? JSON.parse(payload) : payload;

  // Handle Razorpay standard webhook payload: payment.captured, order.paid
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const paymentEntity = event.payload?.payment?.entity;
    if (paymentEntity) {
      const notes = paymentEntity.notes || {};
      const targetOrgId = notes.organizationId || organizationId;
      const targetCustId = notes.customerId;
      const targetInvId = notes.invoiceId;
      const targetSubId = notes.subscriptionId;
      const amount = paymentEntity.amount ? paymentEntity.amount / 100 : 0;

      if (targetOrgId && amount > 0) {
        return await verifyAndRecordGatewayPayment({
          organizationId: targetOrgId,
          customerId: targetCustId,
          invoiceId: targetInvId,
          subscriptionId: targetSubId,
          amount,
          currency: paymentEntity.currency,
          orderId: paymentEntity.order_id,
          paymentId: paymentEntity.id,
          signature,
          idempotencyKey: `wh_${paymentEntity.id}`,
        });
      }
    }
  }

  // Handle generic / sandbox webhook
  if (event.eventType === 'charge.succeeded' && event.data) {
    const { organizationId: dOrgId, customerId, invoiceId, subscriptionId, amount, transactionReference } = event.data;
    if (dOrgId && customerId && amount) {
      return await recordPayment({
        organizationId: dOrgId,
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

  return { received: true, eventType: event.event || event.eventType };
};

/**
 * Issues refunds through payment provider and records audit
 */
export const refundPaymentTransaction = async ({ organizationId, paymentId, amount, reason, userId }) => {
  const payment = await Payment.findOne({ _id: paymentId, organizationId });
  if (!payment) throw new Error('Payment record not found.');

  if (payment.status === 'refunded') {
    throw new Error('Payment has already been refunded.');
  }

  const refundAmt = amount ? roundMoney(amount) : payment.amount;
  const org = await Organization.findById(organizationId);
  const provider = getPaymentProvider(org);

  const refundResult = await provider.refundPayment({
    paymentId: payment.gatewayPaymentId || payment.transactionReference,
    chargeId: payment.transactionReference,
    amount: refundAmt,
    reason,
  });

  payment.status = 'refunded';
  payment.refundId = refundResult.refundId || `rfnd_${Date.now()}`;
  payment.refundAmount = refundAmt;
  payment.refundReason = reason || 'Customer requested refund';
  payment.refundedAt = new Date();
  await payment.save();

  // If linked to an invoice, re-adjust balance due
  if (payment.invoiceId) {
    const invoice = await Invoice.findOne({ _id: payment.invoiceId, organizationId });
    if (invoice) {
      invoice.amountPaid = Math.max(0, roundMoney((invoice.amountPaid || 0) - refundAmt));
      invoice.balanceDue = roundMoney(Math.min(invoice.total, invoice.total - invoice.amountPaid));
      if (invoice.balanceDue === invoice.total) {
        invoice.status = 'sent';
      } else if (invoice.amountPaid > 0) {
        invoice.status = 'partially_paid';
      }
      await invoice.save();
    }
  }

  await logAudit({
    organizationId,
    userId,
    action: 'REFUND_PAYMENT',
    entityType: 'Payment',
    entityId: payment._id,
    metadata: { refundId: payment.refundId, refundAmount: refundAmt, reason },
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
