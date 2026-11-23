import { Contact } from '../models/Contact.js';
import { logAudit } from '../services/audit/auditService.js';

export const getContacts = async (req, res, next) => {
  try {
    const { search, companyId, customerId, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const query = { organizationId: req.organizationId, isDeleted: false };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } },
      ];
    }

    if (companyId) {
      query.companyId = companyId;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [contacts, total] = await Promise.all([
      Contact.find(query)
        .populate('companyId', 'name domain industry')
        .populate('customerId', 'name email company')
        .populate('assignedTo', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Contact.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: contacts,
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

export const getContactById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    })
      .populate('companyId', 'name domain industry phone website')
      .populate('customerId', 'name email company phone')
      .populate('assignedTo', 'name email avatar');

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

export const createContact = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, jobTitle, department, companyId, customerId, isPrimary, assignedTo, notes, socialProfiles } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ success: false, message: 'First name, last name, and email are required.' });
    }

    const contact = await Contact.create({
      organizationId: req.organizationId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone,
      jobTitle: jobTitle || '',
      department: department || '',
      companyId: companyId || undefined,
      customerId: customerId || undefined,
      isPrimary: Boolean(isPrimary),
      assignedTo: assignedTo || req.user._id,
      notes: notes || '',
      socialProfiles: socialProfiles || {},
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'CREATE_CONTACT',
      entityType: 'Contact',
      entityId: contact._id,
      metadata: { name: `${contact.firstName} ${contact.lastName}`, email: contact.email },
    });

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

export const updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    Object.assign(contact, req.body);
    await contact.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPDATE_CONTACT',
      entityType: 'Contact',
      entityId: contact._id,
      metadata: { email: contact.email },
    });

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findOne({
      _id: id,
      organizationId: req.organizationId,
      isDeleted: false,
    });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found.' });
    }

    contact.isDeleted = true;
    await contact.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'DELETE_CONTACT',
      entityType: 'Contact',
      entityId: contact._id,
      metadata: { email: contact.email },
    });

    res.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
