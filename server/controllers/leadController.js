import { Lead } from '../models/Lead.js';
import { Customer } from '../models/Customer.js';
import { InteractionLog } from '../models/InteractionLog.js';
import { logAudit } from '../services/audit/auditService.js';

export const createLead = async (req, res, next) => {
  try {
    const { name, email, phone, company, source, stage = 'new_lead', assignedTo, estimatedValue, notes } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Lead name and email are required.' });
    }

    const lead = await Lead.create({
      organizationId: req.organizationId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone,
      company,
      source: source || 'website',
      stage,
      assignedTo: assignedTo || req.user._id,
      estimatedValue: Number(estimatedValue) || 0,
      notes: notes || '',
      stageHistory: [
        {
          stage,
          changedAt: new Date(),
          changedBy: req.user._id,
        },
      ],
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'CREATE_LEAD',
      entityType: 'Lead',
      entityId: lead._id,
      metadata: { name: lead.name, stage, estimatedValue },
    });

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const getLeads = async (req, res, next) => {
  try {
    const { stage, assignedTo, search } = req.query;

    const query = { organizationId: req.organizationId };

    if (req.user.role === 'employee') {
      query.assignedTo = req.user._id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (stage && stage !== 'all') {
      query.stage = stage;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('convertedCustomerId', 'name company')
      .sort({ createdAt: -1 });

    // Calculate pipeline stage aggregations
    const stages = ['new_lead', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'converted', 'lost'];
    const pipeline = stages.map((stg) => {
      const stageLeads = leads.filter((l) => l.stage === stg);
      const totalVal = stageLeads.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);
      return {
        stage: stg,
        count: stageLeads.length,
        totalValue: totalVal,
        leads: stageLeads,
      };
    });

    res.json({
      success: true,
      data: leads,
      pipeline,
    });
  } catch (error) {
    next(error);
  }
};

export const getLeadById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({ _id: id, organizationId: req.organizationId })
      .populate('assignedTo', 'name email avatar')
      .populate('stageHistory.changedBy', 'name');

    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const lead = await Lead.findOne({ _id: id, organizationId: req.organizationId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });

    if (updates.stage && updates.stage !== lead.stage) {
      lead.stageHistory.push({
        stage: updates.stage,
        changedAt: new Date(),
        changedBy: req.user._id,
      });
      lead.stage = updates.stage;
    }

    const allowed = ['name', 'email', 'phone', 'company', 'source', 'assignedTo', 'estimatedValue', 'notes', 'lostReason'];
    allowed.forEach((f) => {
      if (updates[f] !== undefined) lead[f] = updates[f];
    });

    await lead.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPDATE_LEAD',
      entityType: 'Lead',
      entityId: lead._id,
      metadata: updates,
    });

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLeadStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, lostReason } = req.body;

    if (!stage) return res.status(400).json({ success: false, message: 'New stage is required.' });

    const lead = await Lead.findOne({ _id: id, organizationId: req.organizationId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });

    lead.stage = stage;
    if (lostReason) lead.lostReason = lostReason;

    lead.stageHistory.push({
      stage,
      changedAt: new Date(),
      changedBy: req.user._id,
    });

    await lead.save();

    res.json({
      success: true,
      message: `Lead moved to ${stage}`,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

export const convertLeadToCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findOne({ _id: id, organizationId: req.organizationId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });

    if (lead.stage === 'converted' && lead.convertedCustomerId) {
      return res.status(400).json({ success: false, message: 'This lead has already been converted into a customer.' });
    }

    // Check if customer with same email already exists
    let customer = await Customer.findOne({
      organizationId: req.organizationId,
      email: lead.email,
      isDeleted: false,
    });

    if (!customer) {
      customer = await Customer.create({
        organizationId: req.organizationId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: lead.source,
        lifecycleStatus: 'customer',
        assignedTo: lead.assignedTo || req.user._id,
        notes: `Converted from lead. Original notes: ${lead.notes || 'None'}`,
      });
    } else {
      customer.lifecycleStatus = 'customer';
      await customer.save();
    }

    // Update lead
    lead.stage = 'converted';
    lead.convertedCustomerId = customer._id;
    lead.convertedAt = new Date();
    lead.stageHistory.push({
      stage: 'converted',
      changedAt: new Date(),
      changedBy: req.user._id,
    });
    await lead.save();

    // Log interaction
    await InteractionLog.create({
      organizationId: req.organizationId,
      customerId: customer._id,
      userId: req.user._id,
      interactionType: 'status_change',
      subject: 'Lead Converted to Customer',
      description: `Lead converted successfully by ${req.user.name}.`,
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'CONVERT_LEAD',
      entityType: 'Lead',
      entityId: lead._id,
      metadata: { customerId: customer._id, leadName: lead.name },
    });

    res.json({
      success: true,
      message: `Lead successfully converted to Customer ${customer.name}!`,
      data: {
        lead,
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Lead.deleteOne({ _id: id, organizationId: req.organizationId });

    res.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
