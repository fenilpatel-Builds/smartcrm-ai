import { CalendarEvent } from '../models/CalendarEvent.js';
import { logAudit } from '../services/audit/auditService.js';

export const getEvents = async (req, res, next) => {
  try {
    const { start, end, eventType, status } = req.query;
    const query = { organizationId: req.organizationId };

    if (start && end) {
      query.startDate = { $gte: new Date(start), $lte: new Date(end) };
    } else if (start) {
      query.startDate = { $gte: new Date(start) };
    }

    if (eventType && eventType !== 'all') {
      query.eventType = eventType;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const events = await CalendarEvent.find(query)
      .populate('createdBy', 'name email avatar')
      .populate('attendees.user', 'name email avatar')
      .sort('startDate');

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      eventType = 'meeting',
      startDate,
      endDate,
      allDay = false,
      location,
      meetUrl,
      relatedEntityType = 'none',
      relatedEntityId,
      attendees,
    } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Title, start date, and end date are required.' });
    }

    const event = await CalendarEvent.create({
      organizationId: req.organizationId,
      title: title.trim(),
      description: description || '',
      eventType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allDay: Boolean(allDay),
      location: location || '',
      meetUrl: meetUrl || '',
      relatedEntityType,
      relatedEntityId: relatedEntityId || undefined,
      attendees: attendees || [],
      createdBy: req.user._id,
      status: 'scheduled',
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'CREATE_CALENDAR_EVENT',
      entityType: 'CalendarEvent',
      entityId: event._id,
      metadata: { title: event.title, startDate: event.startDate },
    });

    res.status(201).json({
      success: true,
      message: 'Calendar event created successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await CalendarEvent.findOne({ _id: id, organizationId: req.organizationId });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Calendar event not found.' });
    }

    Object.assign(event, req.body);
    await event.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPDATE_CALENDAR_EVENT',
      entityType: 'CalendarEvent',
      entityId: event._id,
      metadata: { title: event.title },
    });

    res.json({
      success: true,
      message: 'Calendar event updated successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await CalendarEvent.findOneAndDelete({ _id: id, organizationId: req.organizationId });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Calendar event not found.' });
    }

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'DELETE_CALENDAR_EVENT',
      entityType: 'CalendarEvent',
      entityId: event._id,
      metadata: { title: event.title },
    });

    res.json({
      success: true,
      message: 'Calendar event deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
