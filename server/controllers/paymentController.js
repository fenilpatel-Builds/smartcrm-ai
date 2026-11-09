import { Payment } from '../models/Payment.js';
import * as paymentService from '../services/payment/paymentService.js';

export const recordPayment = async (req, res, next) => {
  try {
    const { customerId, subscriptionId, invoiceId, amount, currency, paymentMethod, transactionReference, status, paidAt, notes } = req.body;

    if (!customerId || !amount) {
      return res.status(400).json({ success: false, message: 'Customer ID and Payment amount are required.' });
    }

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
