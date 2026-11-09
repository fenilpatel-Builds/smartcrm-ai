import { InteractionLog } from '../models/InteractionLog.js';
import { Customer } from '../models/Customer.js';
import { logAudit } from '../services/audit/auditService.js';

export const createInteraction = async (req, res, next) => {
  try {
    const { id } = req.params; // customerId
    const { interactionType, subject, description, interactionDate, nextFollowUpDate, metadata } = req.body;

    const customer = await Customer.findOne({ _id: id, organizationId: req.organizationId });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    if (!subject) return res.status(400).json({ success: false, message: 'Subject is required.' });

    const interaction = await InteractionLog.create({
      organizationId: req.organizationId,
      customerId: id,
      userId: req.user._id,
      interactionType: interactionType || 'note',
      subject: subject.trim(),
      description: description || '',
      interactionDate: interactionDate ? new Date(interactionDate) : new Date(),
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
      metadata: metadata || {},
    });

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'LOG_INTERACTION',
      entityType: 'InteractionLog',
      entityId: interaction._id,
      metadata: { customerId: id, interactionType, subject },
    });

    res.status(201).json({
      success: true,
      message: 'Interaction logged successfully',
      data: interaction,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerInteractions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const interactions = await InteractionLog.find({ customerId: id, organizationId: req.organizationId })
      .populate('userId', 'name email avatar')
      .sort({ interactionDate: -1 });

    res.json({
      success: true,
      data: interactions,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInteraction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subject, description, interactionType, nextFollowUpDate } = req.body;

    const interaction = await InteractionLog.findOne({ _id: id, organizationId: req.organizationId });
    if (!interaction) return res.status(404).json({ success: false, message: 'Interaction log not found.' });

    if (subject) interaction.subject = subject;
    if (description !== undefined) interaction.description = description;
    if (interactionType) interaction.interactionType = interactionType;
    if (nextFollowUpDate) interaction.nextFollowUpDate = new Date(nextFollowUpDate);

    await interaction.save();

    res.json({
      success: true,
      message: 'Interaction updated successfully',
      data: interaction,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteInteraction = async (req, res, next) => {
  try {
    const { id } = req.params;
    await InteractionLog.deleteOne({ _id: id, organizationId: req.organizationId });

    res.json({
      success: true,
      message: 'Interaction deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
