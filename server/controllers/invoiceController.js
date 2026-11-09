import { Invoice } from '../models/Invoice.js';
import * as invoiceService from '../services/invoice/invoiceService.js';
import * as paymentService from '../services/payment/paymentService.js';

export const createInvoice = async (req, res, next) => {
  try {
    const { customerId, subscriptionId, items, discount, tax, dueDate, notes } = req.body;

    if (!customerId || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Customer ID and at least one item are required.' });
    }

    const invoice = await invoiceService.createInvoice({
      organizationId: req.organizationId,
      customerId,
      subscriptionId,
      items,
      discount,
      tax,
      dueDate,
      notes,
      userId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoices = async (req, res, next) => {
  try {
    const { status, customerId, page = 1, limit = 20 } = req.query;

    const query = { organizationId: req.organizationId };

    if (status && status !== 'all') query.status = status;
    if (customerId) query.customerId = customerId;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('customerId', 'name company email phone')
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limitNum),
      Invoice.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: invoices,
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

export const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findOne({ _id: id, organizationId: req.organizationId })
      .populate('customerId')
      .populate('subscriptionId');

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadInvoicePDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    await invoiceService.buildInvoicePDF(id, req.organizationId, res);
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const invoice = await Invoice.findOne({ _id: id, organizationId: req.organizationId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    if (updates.status) invoice.status = updates.status;
    if (updates.dueDate) invoice.dueDate = new Date(updates.dueDate);
    if (updates.notes !== undefined) invoice.notes = updates.notes;

    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const recordInvoicePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, transactionReference, notes } = req.body;

    const invoice = await Invoice.findOne({ _id: id, organizationId: req.organizationId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const payAmount = Number(amount) || invoice.balanceDue;

    const payment = await paymentService.recordPayment({
      organizationId: req.organizationId,
      customerId: invoice.customerId,
      subscriptionId: invoice.subscriptionId,
      invoiceId: invoice._id,
      amount: payAmount,
      paymentMethod: paymentMethod || 'credit_card',
      transactionReference,
      status: 'paid',
      notes,
      userId: req.user._id,
    });

    const updatedInvoice = await Invoice.findById(id).populate('customerId');

    res.json({
      success: true,
      message: `Payment of $${payAmount} applied to invoice ${invoice.invoiceNumber}`,
      data: {
        invoice: updatedInvoice,
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
};
