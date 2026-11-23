import { Payment } from '../models/Payment.js';
import { Organization } from '../models/Organization.js';
import * as paymentService from '../services/payment/paymentService.js';
import { logAudit } from '../services/audit/auditService.js';

export const getPaymentConfig = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    const config = paymentService.getProviderPublicConfig(org);
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

export const createPaymentOrder = async (req, res, next) => {
  try {
    const { customerId, invoiceId, subscriptionId, amount, currency, notes } = req.body;
    const order = await paymentService.createPaymentOrder({
      organizationId: req.organizationId,
      customerId,
      invoiceId,
      subscriptionId,
      amount: amount ? Number(amount) : undefined,
      currency,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { customerId, invoiceId, subscriptionId, amount, currency, orderId, paymentId, signature, idempotencyKey } = req.body;

    if (!orderId || !paymentId) {
      return res.status(400).json({ success: false, message: 'Order ID and Payment ID are required for verification.' });
    }

    const key = req.headers['idempotency-key'] || idempotencyKey;

    const result = await paymentService.verifyAndRecordGatewayPayment({
      organizationId: req.organizationId,
      customerId,
      invoiceId,
      subscriptionId,
      amount: Number(amount),
      currency,
      orderId,
      paymentId,
      signature,
      idempotencyKey: key,
      userId: req.user?._id,
    });

    res.status(200).json({
      success: true,
      message: result.isDuplicate ? 'Payment already reconciled' : 'Payment verified and recorded successfully',
      data: result.payment,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Payment signature verification failed',
    });
  }
};

export const refundPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const refunded = await paymentService.refundPaymentTransaction({
      organizationId: req.organizationId,
      paymentId: id,
      amount: amount ? Number(amount) : undefined,
      reason,
      userId: req.user._id,
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: refunded,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentSettings = async (req, res, next) => {
  try {
    const { provider, keyId, keySecret, webhookSecret, mode, currency } = req.body;

    const org = await Organization.findById(req.organizationId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    if (!org.integrations) org.integrations = {};
    if (!org.integrations.payment) org.integrations.payment = {};

    if (provider) org.integrations.payment.provider = provider;
    if (keyId !== undefined) org.integrations.payment.keyId = keyId;
    if (keySecret !== undefined) org.integrations.payment.keySecret = keySecret;
    if (webhookSecret !== undefined) org.integrations.payment.webhookSecret = webhookSecret;
    if (mode) org.integrations.payment.mode = mode;
    if (currency) org.integrations.payment.currency = currency;

    await org.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPDATE_PAYMENT_GATEWAY_SETTINGS',
      entityType: 'Organization',
      entityId: org._id,
      metadata: { provider: org.integrations.payment.provider, mode: org.integrations.payment.mode },
    });

    res.json({
      success: true,
      message: 'Payment gateway configuration updated successfully',
      data: paymentService.getProviderPublicConfig(org),
    });
  } catch (error) {
    next(error);
  }
};

export const recordPayment = async (req, res, next) => {
  try {
    const { customerId, subscriptionId, invoiceId, amount, currency, paymentMethod, transactionReference, status, paidAt, notes, idempotencyKey } = req.body;

    if (!customerId || !amount) {
      return res.status(400).json({ success: false, message: 'Customer ID and Payment amount are required.' });
    }

    const key = req.headers['idempotency-key'] || idempotencyKey;

    const payment = await paymentService.recordPayment({
      organizationId: req.organizationId,
      customerId,
      subscriptionId,
      invoiceId,
      amount: Number(amount),
      currency,
      paymentMethod,
      transactionReference,
      status,
      paidAt,
      notes,
      idempotencyKey: key,
      userId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-payment-signature'] || req.headers['x-sandbox-signature'];
    const result = await paymentService.handlePaymentWebhook({
      payload: req.body,
      signature,
    });

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      data: result,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Webhook processing failed',
    });
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const { customerId, status, page = 1, limit = 20, exportFormat } = req.query;

    const query = { organizationId: req.organizationId };

    if (customerId) query.customerId = customerId;
    if (status && status !== 'all') query.status = status;

    if (exportFormat === 'csv') {
      const allPayments = await Payment.find(query)
        .populate('customerId', 'name company email')
        .sort({ paidAt: -1 });

      let csv = 'Payment ID,Transaction Ref,Customer,Company,Amount,Currency,Status,Method,Date\n';
      allPayments.forEach((p) => {
        csv += `"${p._id}","${p.transactionReference}","${p.customerId?.name || ''}","${p.customerId?.company || ''}","${p.amount}","${p.currency}","${p.status}","${p.paymentMethod}","${p.paidAt ? p.paidAt.toISOString() : ''}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=payments_export.csv');
      return res.send(csv);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('customerId', 'name email company')
        .populate('invoiceId', 'invoiceNumber total balanceDue')
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Payment.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findOne({ _id: id, organizationId: req.organizationId })
      .populate('customerId')
      .populate('subscriptionId')
      .populate('invoiceId');

    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'paid', 'failed', 'refunded', 'partially_paid'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status.' });
    }

    const payment = await Payment.findOne({ _id: id, organizationId: req.organizationId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });

    payment.status = status;
    if (status === 'paid' && !payment.paidAt) {
      payment.paidAt = new Date();
    }
    await payment.save();

    res.json({
      success: true,
      message: `Payment status updated to ${status}`,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

export const getOverduePayments = async (req, res, next) => {
  try {
    const overdue = await paymentService.getOverduePayments(req.organizationId);
    res.json({
      success: true,
      data: overdue,
    });
  } catch (error) {
    next(error);
  }
};
