import { Customer } from '../models/Customer.js';
import { Subscription } from '../models/Subscription.js';
import { Payment } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';
import { InteractionLog } from '../models/InteractionLog.js';
import { Task } from '../models/Task.js';
import { AIInsight } from '../models/AIInsight.js';
import { logAudit } from '../services/audit/auditService.js';
import { calculateSubscriptionMRR } from '../services/subscription/subscriptionService.js';

export const createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, company, address, source, lifecycleStatus, assignedTo, tags, notes } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Customer name and email are required.' });
    }

    const existing = await Customer.findOne({
      organizationId: req.organizationId,
      email: email.toLowerCase().trim(),
      isDeleted: false,
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'A customer with this email already exists in your workspace.' });
    }

    const customer = await Customer.create({
      organizationId: req.organizationId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone,
      company,
      address,
      source: source || 'website',
      lifecycleStatus: lifecycleStatus || 'customer',
      assignedTo: assignedTo || req.user._id,
      tags: tags || [],
      notes: notes || '',
    });

    // Create an initial interaction log
    await InteractionLog.create({
      organizationId: req.organizationId,
      customerId: customer._id,
      userId: req.user._id,
      interactionType: 'note',
      subject: 'Customer Created',
      description: `Account created by ${req.user.name}.`,
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'CREATE_CUSTOMER',
      entityType: 'Customer',
      entityId: customer._id,
      metadata: { name: customer.name, email: customer.email },
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      lifecycleStatus,
      assignedTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      exportFormat,
    } = req.query;

    const query = {
      organizationId: req.organizationId,
      isDeleted: false,
    };

    // Employee role scoping: if employee, can see only assigned unless manager/owner/super_admin
    if (req.user.role === 'employee') {
      query.assignedTo = req.user._id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (lifecycleStatus && lifecycleStatus !== 'all') {
      query.lifecycleStatus = lifecycleStatus;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // CSV Export option
    if (exportFormat === 'csv') {
      const customers = await Customer.find(query)
        .populate('assignedTo', 'name email')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 });

      let csv = 'ID,Name,Email,Phone,Company,Lifecycle Status,Source,Assigned To,Created At\n';
      customers.forEach((c) => {
        csv += `"${c._id}","${c.name}","${c.email}","${c.phone || ''}","${c.company || ''}","${c.lifecycleStatus}","${
          c.source
        }","${c.assignedTo?.name || 'Unassigned'}","${c.createdAt.toISOString()}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=customers_export.csv');
      return res.send(csv);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .populate('assignedTo', 'name email avatar')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limitNum),
      Customer.countDocuments(query),
    ]);

    // Attach active subscription summary and latest risk insight to each customer
    const customerIds = customers.map((c) => c._id);

    const [activeSubscriptions, insights] = await Promise.all([
      Subscription.find({
        customerId: { $in: customerIds },
        organizationId: req.organizationId,
      }).populate('planId', 'name pricing'),
      AIInsight.find({
        customerId: { $in: customerIds },
        organizationId: req.organizationId,
        insightType: 'churn_analysis',
      }),
    ]);

    const enrichedCustomers = customers.map((cust) => {
      const custObj = cust.toObject();
      const subs = activeSubscriptions.filter((s) => s.customerId.toString() === cust._id.toString());
      const activeSub = subs.find((s) => ['active', 'trial'].includes(s.status));
      const insight = insights.find((i) => i.customerId.toString() === cust._id.toString());

      custObj.subscription = activeSub
        ? {
            id: activeSub._id,
            planName: activeSub.planId?.name,
            amount: activeSub.amount,
            status: activeSub.status,
            mrr: calculateSubscriptionMRR(activeSub),
            renewalDate: activeSub.nextRenewalDate,
          }
        : null;

      custObj.churnRisk = insight
        ? {
            score: insight.riskScore,
            level: insight.riskLevel,
          }
        : null;

      return custObj;
    });

    res.json({
      success: true,
      data: enrichedCustomers,
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

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    }).populate('assignedTo', 'name email avatar phone');

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Load full 360 profile context
    const [subscriptions, payments, invoices, timeline, tasks, aiInsights] = await Promise.all([
      Subscription.find({ customerId: id, organizationId: req.organizationId })
        .populate('planId')
        .sort({ createdAt: -1 }),
      Payment.find({ customerId: id, organizationId: req.organizationId }).sort({ paidAt: -1 }).limit(10),
      Invoice.find({ customerId: id, organizationId: req.organizationId }).sort({ issueDate: -1 }).limit(10),
      InteractionLog.find({ customerId: id, organizationId: req.organizationId })
        .populate('userId', 'name avatar')
        .sort({ interactionDate: -1 }),
      Task.find({ customerId: id, organizationId: req.organizationId })
        .populate('assignedTo', 'name')
        .sort({ dueDate: 1 }),
      AIInsight.find({ customerId: id, organizationId: req.organizationId }).sort({ generatedAt: -1 }),
    ]);

    // Financial aggregation
    const totalRevenue = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const outstandingPayments = invoices
      .filter((inv) => ['sent', 'partially_paid', 'overdue'].includes(inv.status))
      .reduce((sum, inv) => sum + inv.balanceDue, 0);

    const activeSubscription = subscriptions.find((s) => ['active', 'trial'].includes(s.status));

    res.json({
      success: true,
      data: {
        customer,
        subscriptions,
        activeSubscription,
        financialOverview: {
          totalRevenue,
          outstandingPayments,
          paidInvoicesCount: invoices.filter((i) => i.status === 'paid').length,
          overdueInvoicesCount: invoices.filter((i) => i.status === 'overdue' || (i.dueDate < new Date() && i.balanceDue > 0)).length,
        },
        payments,
        invoices,
        timeline,
        tasks,
        aiInsights,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const customer = await Customer.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Apply allowed updates
    const allowedFields = [
      'name',
      'email',
      'phone',
      'company',
      'address',
      'source',
      'lifecycleStatus',
      'assignedTo',
      'tags',
      'notes',
      'customFields',
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        customer[field] = updates[field];
      }
    });

    await customer.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPDATE_CUSTOMER',
      entityType: 'Customer',
      entityId: customer._id,
      metadata: updates,
    });

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Soft deletion to maintain financial and historical integrity
    customer.isDeleted = true;
    await customer.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'DELETE_CUSTOMER',
      entityType: 'Customer',
      entityId: customer._id,
      metadata: { name: customer.name, email: customer.email },
    });

    res.json({
      success: true,
      message: 'Customer successfully archived and soft-deleted.',
    });
  } catch (error) {
    next(error);
  }
};

export const bulkCustomerActions = async (req, res, next) => {
  try {
    const { action, ids, data } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one customer ID is required.' });
    }

    if (action === 'delete') {
      await Customer.updateMany(
        { _id: { $in: ids }, organizationId: req.organizationId },
        { $set: { isDeleted: true } }
      );
      return res.json({ success: true, message: `${ids.length} customers successfully deleted.` });
    }

    if (action === 'update_status' && data?.lifecycleStatus) {
      await Customer.updateMany(
        { _id: { $in: ids }, organizationId: req.organizationId },
        { $set: { lifecycleStatus: data.lifecycleStatus } }
      );
      return res.json({ success: true, message: `${ids.length} customers status updated to ${data.lifecycleStatus}.` });
    }

    if (action === 'reassign' && data?.assignedTo) {
      await Customer.updateMany(
        { _id: { $in: ids }, organizationId: req.organizationId },
        { $set: { assignedTo: data.assignedTo } }
      );
      return res.json({ success: true, message: `${ids.length} customers reassigned.` });
    }

    res.status(400).json({ success: false, message: 'Unsupported bulk action.' });
  } catch (error) {
    next(error);
  }
};

export const importCustomers = async (req, res, next) => {
  try {
    const { customers } = req.body;
    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ success: false, message: 'Array of customer objects is required.' });
    }

    const inserted = [];
    const skipped = [];

    for (const c of customers) {
      if (!c.name || !c.email) {
        skipped.push({ customer: c, reason: 'Missing name or email' });
        continue;
      }

      const exists = await Customer.findOne({
        organizationId: req.organizationId,
        email: c.email.toLowerCase().trim(),
        isDeleted: false,
      });

      if (exists) {
        skipped.push({ customer: c, reason: 'Duplicate email' });
        continue;
      }

      const newCust = await Customer.create({
        organizationId: req.organizationId,
        name: c.name.trim(),
        email: c.email.toLowerCase().trim(),
        phone: c.phone || '',
        company: c.company || '',
        source: c.source || 'website',
        lifecycleStatus: c.lifecycleStatus || 'customer',
        assignedTo: req.user._id,
      });

      inserted.push(newCust);
    }

    res.status(201).json({
      success: true,
      message: `Imported ${inserted.length} customer(s). Skipped ${skipped.length}.`,
      data: {
        importedCount: inserted.length,
        skippedCount: skipped.length,
        skipped,
      },
    });
  } catch (error) {
    next(error);
  }
};
