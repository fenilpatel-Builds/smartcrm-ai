import { SupportTicket } from '../models/SupportTicket.js';
import { Customer } from '../models/Customer.js';
import { logAudit } from '../services/audit/auditService.js';

export const getTickets = async (req, res, next) => {
  try {
    const { status, priority, category, customerId, assignedTo, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const query = { organizationId: req.organizationId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .populate('customerId', 'name email company phone')
        .populate('contactId', 'firstName lastName email phone')
        .populate('assignedTo', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10)),
      SupportTicket.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findOne({ _id: id, organizationId: req.organizationId })
      .populate('customerId', 'name email company phone address')
      .populate('contactId', 'firstName lastName email phone jobTitle')
      .populate('assignedTo', 'name email avatar')
      .populate('messages.sender', 'name email avatar');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found.' });
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const createTicket = async (req, res, next) => {
  try {
    const { subject, description, customerId, contactId, priority = 'medium', assignedTo, category = 'general', tags } = req.body;

    if (!subject || !description || !customerId) {
      return res.status(400).json({ success: false, message: 'Subject, description, and customer ID are required.' });
    }

    const count = await SupportTicket.countDocuments({ organizationId: req.organizationId });
    const ticketNumber = `TCK-${1000 + count + 1}`;

    const ticket = await SupportTicket.create({
      organizationId: req.organizationId,
      ticketNumber,
      subject: subject.trim(),
      description: description.trim(),
      customerId,
      contactId: contactId || undefined,
      priority,
      status: 'open',
      assignedTo: assignedTo || req.user._id,
      category,
      tags: tags || [],
      messages: [
        {
          sender: req.user._id,
          senderName: req.user.name,
          senderType: 'agent',
          content: description.trim(),
          createdAt: new Date(),
        },
      ],
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'CREATE_TICKET',
      entityType: 'SupportTicket',
      entityId: ticket._id,
      metadata: { ticketNumber, subject: ticket.subject },
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findOne({ _id: id, organizationId: req.organizationId });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    Object.assign(ticket, req.body);
    if (req.body.status === 'resolved' || req.body.status === 'closed') {
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPDATE_TICKET',
      entityType: 'SupportTicket',
      entityId: ticket._id,
      metadata: { ticketNumber: ticket.ticketNumber, status: ticket.status },
    });

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const addTicketMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, senderType = 'agent' } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const ticket = await SupportTicket.findOne({ _id: id, organizationId: req.organizationId });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    ticket.messages.push({
      sender: req.user._id,
      senderName: req.user.name,
      senderType,
      content: content.trim(),
      createdAt: new Date(),
    });

    if (ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    res.status(201).json({
      success: true,
      message: 'Message added to ticket',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const getTicketMetrics = async (req, res, next) => {
  try {
    const [open, inProgress, waiting, resolved, urgent] = await Promise.all([
      SupportTicket.countDocuments({ organizationId: req.organizationId, status: 'open' }),
      SupportTicket.countDocuments({ organizationId: req.organizationId, status: 'in_progress' }),
      SupportTicket.countDocuments({ organizationId: req.organizationId, status: 'waiting' }),
      SupportTicket.countDocuments({ organizationId: req.organizationId, status: { $in: ['resolved', 'closed'] } }),
      SupportTicket.countDocuments({ organizationId: req.organizationId, priority: 'urgent', status: { $nin: ['resolved', 'closed'] } }),
    ]);

    res.json({
      success: true,
      data: {
        total: open + inProgress + waiting + resolved,
        open,
        inProgress,
        waiting,
        resolved,
        urgent,
      },
    });
  } catch (error) {
    next(error);
  }
};
