import { EmailLog } from '../models/EmailLog.js';
import { Organization } from '../models/Organization.js';
import * as emailService from '../services/email/emailService.js';
import { logAudit } from '../services/audit/auditService.js';

export const sendEmailMessage = async (req, res, next) => {
  try {
    const { to, recipientName, subject, html, text, templateType, templateData, relatedEntityType, relatedEntityId } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, message: 'Recipient email is required.' });
    }

    const logEntry = await emailService.sendEmail({
      organizationId: req.organizationId,
      to,
      recipientName,
      subject,
      html,
      text,
      templateType,
      templateData,
      relatedEntityType,
      relatedEntityId,
      sentBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: logEntry.status === 'sent' ? 'Email dispatched successfully' : 'Email recorded with delivery failure',
      data: logEntry,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmailLogs = async (req, res, next) => {
  try {
    const { status, templateType, search, page = 1, limit = 20 } = req.query;
    const query = { organizationId: req.organizationId };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (templateType && templateType !== 'all') {
      query.templateType = templateType;
    }
    if (search) {
      query.$or = [
        { 'recipient.email': { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      EmailLog.find(query)
        .populate('sentBy', 'name email')
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limitNum),
      EmailLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const previewTemplate = async (req, res, next) => {
  try {
    const { templateType, templateData } = req.body;
    const org = await Organization.findById(req.organizationId);
    const rendered = emailService.renderTemplate(templateType || 'custom', {
      ...templateData,
      brandName: org?.name || 'SmartCRM AI',
    });

    res.json({
      success: true,
      data: rendered,
    });
  } catch (error) {
    next(error);
  }
};

export const sendTestEmail = async (req, res, next) => {
  try {
    const { recipientEmail } = req.body;
    const targetEmail = recipientEmail || req.user.email;

    const logEntry = await emailService.sendTestEmail({
      organizationId: req.organizationId,
      recipientEmail: targetEmail,
      sentBy: req.user._id,
    });

    res.json({
      success: true,
      message: `Diagnostic test email dispatched to ${targetEmail}`,
      data: logEntry,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmailSettings = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    const emailConfig = org?.integrations?.email || {};

    res.json({
      success: true,
      data: {
        provider: emailConfig.provider || 'mock',
        fromName: emailConfig.fromName || org?.name || 'SmartCRM AI',
        fromEmail: emailConfig.fromEmail || '',
        smtpHost: emailConfig.smtpHost || '',
        smtpPort: emailConfig.smtpPort || 587,
        smtpUser: emailConfig.smtpUser || '',
        isConfigured: emailConfig.provider === 'smtp' ? Boolean(emailConfig.smtpHost && emailConfig.smtpUser) : true,
        monthlyAllowance: org?.planLimits?.monthlyEmailAllowance || 2000,
        sentThisMonth: org?.planLimits?.emailsSentThisMonth || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmailSettings = async (req, res, next) => {
  try {
    const { provider, fromName, fromEmail, smtpHost, smtpPort, smtpUser, smtpPassword, apiKey } = req.body;

    const org = await Organization.findById(req.organizationId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });

    if (!org.integrations) org.integrations = {};
    if (!org.integrations.email) org.integrations.email = {};

    if (provider) org.integrations.email.provider = provider;
    if (fromName !== undefined) org.integrations.email.fromName = fromName;
    if (fromEmail !== undefined) org.integrations.email.fromEmail = fromEmail;
    if (smtpHost !== undefined) org.integrations.email.smtpHost = smtpHost;
    if (smtpPort !== undefined) org.integrations.email.smtpPort = Number(smtpPort);
    if (smtpUser !== undefined) org.integrations.email.smtpUser = smtpUser;
    if (smtpPassword !== undefined) org.integrations.email.smtpPassword = smtpPassword;
    if (apiKey !== undefined) org.integrations.email.apiKey = apiKey;

    await org.save();

    await logAudit({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'UPDATE_EMAIL_SETTINGS',
      entityType: 'Organization',
      entityId: org._id,
      metadata: { provider: org.integrations.email.provider, fromEmail: org.integrations.email.fromEmail },
    });

    res.json({
      success: true,
      message: 'Email settings saved successfully',
    });
  } catch (error) {
    next(error);
  }
};
