import crypto from 'crypto';
import { Customer } from '../models/Customer.js';
import { Organization } from '../models/Organization.js';
import { Subscription } from '../models/Subscription.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { Document } from '../models/Document.js';
import { createPaymentOrder, verifyAndRecordGatewayPayment } from '../services/payment/paymentService.js';
import { broadcastNotification } from '../services/notification/sseService.js';

/**
 * Public endpoint: Loads customer self-service billing & support portal
 */
export const getPortalData = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Portal access token is required.' });
    }

    const customer = await Customer.findOne({ portalAccessToken: token, isDeleted: false })
      .select('name email phone company address lifecycleStatus createdAt portalAccessToken organizationId');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Invalid or expired portal link.' });
    }

    const org = await Organization.findById(customer.organizationId)
      .select('name slug logo primaryColor defaultCurrency contactEmail supportPhone invoicePrefix');

    const [subscriptions, invoices, payments, tickets, documents] = await Promise.all([
      Subscription.find({ customerId: customer._id })
        .populate('planId', 'name tier price billingFrequency features')
        .sort({ createdAt: -1 }),
      Invoice.find({ customerId: customer._id })
        .sort({ issueDate: -1 }),
      Payment.find({ customerId: customer._id })
        .sort({ paymentDate: -1 }),
      SupportTicket.find({ customerId: customer._id })
        .sort({ createdAt: -1 })
        .select('ticketNumber subject priority status messages createdAt updatedAt'),
      Document.find({ customerId: customer._id, isArchived: false })
        .select('title category originalName fileSize mimeType eSignature createdAt'),
    ]);

    return res.json({
      success: true,
      portal: {
        customer: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          company: customer.company,
          phone: customer.phone,
        },
        organization: org,
        subscriptions,
        invoices,
        payments,
        tickets,
        documents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public endpoint: Customer initiates invoice payment from portal
 */
export const createPortalPaymentOrder = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { invoiceId } = req.body;

    const customer = await Customer.findOne({ portalAccessToken: token, isDeleted: false });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Invalid or expired portal link.' });
    }

    const invoice = await Invoice.findOne({ _id: invoiceId, customerId: customer._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (invoice.balanceDue <= 0) {
      return res.status(400).json({ success: false, message: 'Invoice is already settled in full.' });
    }

    const orderResult = await createPaymentOrder({
      organizationId: customer.organizationId,
      customerId: customer._id,
      invoiceId: invoice._id,
      subscriptionId: invoice.subscriptionId,
      amount: invoice.balanceDue,
      currency: invoice.currency || 'INR',
      notes: { portalPayment: 'true', customerEmail: customer.email },
    });

    return res.json({
      success: true,
      order: orderResult,
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        balanceDue: invoice.balanceDue,
        currency: invoice.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public endpoint: Customer submits payment verification from portal
 */
export const verifyPortalPayment = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { invoiceId, orderId, paymentId, signature } = req.body;

    const customer = await Customer.findOne({ portalAccessToken: token, isDeleted: false });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Invalid or expired portal link.' });
    }

    const invoice = await Invoice.findOne({ _id: invoiceId, customerId: customer._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const verificationResult = await verifyAndRecordGatewayPayment({
      organizationId: customer.organizationId,
      customerId: customer._id,
      invoiceId: invoice._id,
      subscriptionId: invoice.subscriptionId,
      amount: invoice.balanceDue,
      currency: invoice.currency || 'INR',
      orderId,
      paymentId,
      signature,
    });

    // Broadcast live notification to connected staff
    broadcastNotification(customer.organizationId, 'payment_received', {
      customerName: customer.name,
      amount: invoice.balanceDue,
      invoiceNumber: invoice.invoiceNumber,
      source: 'Customer Portal',
    });

    return res.json({
      success: true,
      message: 'Payment verified and credited successfully.',
      payment: verificationResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public endpoint: Customer creates support ticket from portal
 */
export const createPortalSupportTicket = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { subject, message, priority = 'medium', category = 'general' } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required.' });
    }

    const customer = await Customer.findOne({ portalAccessToken: token, isDeleted: false });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Invalid or expired portal link.' });
    }

    const ticketNumber = `TCK-${Date.now().toString().slice(-6)}`;
    const ticket = await SupportTicket.create({
      organizationId: customer.organizationId,
      customerId: customer._id,
      ticketNumber,
      subject,
      description: message,
      priority,
      category,
      status: 'open',
      messages: [
        {
          senderName: customer.name,
          senderType: 'customer',
          content: message,
        },
      ],
    });

    // Broadcast live alert to staff
    broadcastNotification(customer.organizationId, 'ticket_created', {
      ticketNumber,
      subject,
      customerName: customer.name,
      priority,
    });

    return res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully.',
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticated CRM staff endpoint: Generate or refresh customer portal link
 */
export const generateCustomerPortalLink = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findOne({
      _id: customerId,
      organizationId: req.user.organizationId,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    customer.portalAccessToken = crypto.randomBytes(16).toString('hex');
    await customer.save();

    const portalUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/portal/${customer.portalAccessToken}`;

    return res.json({
      success: true,
      portalAccessToken: customer.portalAccessToken,
      portalUrl,
    });
  } catch (error) {
    next(error);
  }
};
