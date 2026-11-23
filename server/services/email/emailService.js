import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { EmailLog } from '../../models/EmailLog.js';
import { Organization } from '../../models/Organization.js';
import { logAudit } from '../audit/auditService.js';

/**
 * Generates responsive standard HTML email templates for CRM transactional use cases
 */
export const renderTemplate = (templateType, data = {}) => {
  const brandName = data.brandName || 'SmartCRM AI';
  const primaryColor = '#4f46e5';

  const baseHeader = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: ${primaryColor}; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">${brandName}</h1>
      </div>
      <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
  `;

  const baseFooter = `
      </div>
      <div style="background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0;">Sent via ${brandName} CRM Platform &bull; Automated System Communication</p>
      </div>
    </div>
  `;

  switch (templateType) {
    case 'customer_onboarding':
      return {
        subject: `Welcome to ${brandName}! Your Account is Ready`,
        text: `Hello ${data.customerName || 'there'},\n\nWelcome to ${brandName}. Your account has been provisioned.\nAccess your customer portal: ${data.portalUrl || '#'}\n\nBest regards,\nThe Team`,
        html: `
          ${baseHeader}
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Welcome aboard, ${data.customerName || 'valued customer'}!</h2>
          <p>We are thrilled to welcome you to <strong>${brandName}</strong>. Your organization workspace and subscription profile have been successfully activated.</p>
          <div style="margin: 28px 0; text-align: center;">
            <a href="${data.portalUrl || '#'}" style="background: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">Access Customer Portal</a>
          </div>
          <p style="font-size: 14px; color: #475569;">If you have questions, reply directly to this email or contact your designated success manager.</p>
          ${baseFooter}
        `,
      };

    case 'invoice_notice':
      return {
        subject: `New Invoice #${data.invoiceNumber || 'INV-001'} from ${brandName}`,
        text: `Hello ${data.customerName || 'there'},\n\nA new invoice (${data.invoiceNumber}) totaling ${data.amount || '$0.00'} has been issued. Due date: ${data.dueDate || 'Upon Receipt'}.\nView and pay online: ${data.paymentUrl || '#'}\n\nThank you for your business.`,
        html: `
          ${baseHeader}
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Invoice #${data.invoiceNumber || 'INV-001'}</h2>
          <p>Hello ${data.customerName || 'there'}, your statement for current billing cycle is ready.</p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 4px 0; color: #64748b;">Amount Due:</td><td style="text-align: right; font-weight: 700; color: #0f172a; font-size: 16px;">${data.amount || '$0.00'}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Due Date:</td><td style="text-align: right; color: #0f172a;">${data.dueDate || 'Upon receipt'}</td></tr>
              <tr><td style="padding: 4px 0; color: #64748b;">Invoice ID:</td><td style="text-align: right; color: #0f172a;">${data.invoiceNumber || 'INV'}</td></tr>
            </table>
          </div>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${data.paymentUrl || '#'}" style="background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">Pay Invoice Online</a>
          </div>
          ${baseFooter}
        `,
      };

    case 'renewal_reminder':
      return {
        subject: `Upcoming Subscription Renewal Notice [${brandName}]`,
        text: `Hi ${data.customerName || 'there'},\n\nYour subscription to the ${data.planName || 'Plan'} will automatically renew on ${data.renewalDate || 'soon'} for ${data.amount || '$0.00'}.\n\nThank you for your continued partnership!`,
        html: `
          ${baseHeader}
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Subscription Renewal Notice</h2>
          <p>Hi ${data.customerName || 'there'},</p>
          <p>This is a friendly reminder that your subscription to the <strong>${data.planName || 'Active'} Plan</strong> will renew on <strong>${data.renewalDate || 'your next billing date'}</strong>.</p>
          <p>Renewal Amount: <strong>${data.amount || '$0.00'}</strong></p>
          <p>No action is needed if your payment details are up to date. To modify seats, upgrade, or review billing settings, visit your portal below:</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${data.billingUrl || '#'}" style="background: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">Review Subscription</a>
          </div>
          ${baseFooter}
        `,
      };

    case 'payment_failed':
      return {
        subject: `Action Required: Payment Failed for ${brandName}`,
        text: `Hello ${data.customerName || 'there'},\n\nWe were unable to process the recent payment for Invoice #${data.invoiceNumber || ''}. Please update your payment method: ${data.retryUrl || '#'}\n\nThank you.`,
        html: `
          ${baseHeader}
          <h2 style="font-size: 18px; color: #dc2626; margin-top: 0;">Payment Processing Notice</h2>
          <p>Hello ${data.customerName || 'there'},</p>
          <p>We encountered an issue processing the recurring charge for your <strong>${brandName}</strong> subscription.</p>
          <p>To avoid service disruption, please review and update your payment method:</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${data.retryUrl || '#'}" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; display: inline-block;">Update Payment Details</a>
          </div>
          ${baseFooter}
        `,
      };

    case 'ticket_update':
      return {
        subject: `Update on Ticket #${data.ticketNumber || 'TCK'}: ${data.ticketSubject || ''}`,
        text: `Hello ${data.customerName || 'there'},\n\nYour support ticket #${data.ticketNumber} has an update:\n\n${data.latestReply || 'Status updated'}\n\nView ticket: ${data.ticketUrl || '#'}`,
        html: `
          ${baseHeader}
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Support Ticket #${data.ticketNumber || 'TCK'}</h2>
          <p>Hello ${data.customerName || 'there'}, there is a new update regarding your support ticket:</p>
          <div style="background: #f8fafc; border-left: 4px solid ${primaryColor}; padding: 14px; margin: 18px 0; font-size: 14px;">
            ${data.latestReply || 'Your support case has been reviewed by our customer engineering team.'}
          </div>
          <div style="margin: 20px 0; text-align: center;">
            <a href="${data.ticketUrl || '#'}" style="background: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">View Ticket Conversation</a>
          </div>
          ${baseFooter}
        `,
      };

    default: // custom or lead_follow_up
      return {
        subject: data.subject || `Message from ${brandName}`,
        text: data.text || data.message || '',
        html: `
          ${baseHeader}
          <div style="font-size: 15px; color: #334155; line-height: 1.6;">
            ${(data.html || data.message || '').replace(/\n/g, '<br/>')}
          </div>
          ${baseFooter}
        `,
      };
  }
};

/**
 * Creates a Nodemailer transport from organization or environment settings
 */
export const getEmailTransport = (org = {}) => {
  const emailConfig = org?.integrations?.email || {};
  const provider = emailConfig.provider || process.env.EMAIL_PROVIDER || 'mock';

  if (provider === 'smtp' && emailConfig.smtpHost) {
    return {
      provider: 'smtp',
      transporter: nodemailer.createTransport({
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort || 587,
        secure: emailConfig.smtpPort === 465,
        auth: {
          user: emailConfig.smtpUser,
          pass: emailConfig.smtpPassword,
        },
      }),
      fromEmail: emailConfig.fromEmail || `noreply@${org.slug || 'smartcrm'}.com`,
      fromName: emailConfig.fromName || org.name || 'SmartCRM AI',
    };
  }

  // Safe mock/sandbox transport for local testing and unconfigured mode
  return {
    provider: 'mock',
    transporter: {
      sendMail: async (options) => ({
        messageId: `msg_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        response: '250 Mock email accepted and logged',
        envelope: { from: options.from, to: options.to },
      }),
    },
    fromEmail: emailConfig.fromEmail || 'noreply@smartcrm.local',
    fromName: emailConfig.fromName || org.name || 'SmartCRM AI',
  };
};

/**
 * Sends a transactional or marketing email with tracking and plan allowance checks
 */
export const sendEmail = async ({
  organizationId,
  to,
  recipientName = '',
  subject,
  html,
  text,
  templateType = 'custom',
  templateData = {},
  relatedEntityType = 'general',
  relatedEntityId,
  sentBy,
  isTestEmail = false,
}) => {
  if (!to || !to.includes('@')) {
    throw new Error('A valid recipient email address is required.');
  }

  const org = await Organization.findById(organizationId);
  if (!org) throw new Error('Organization not found.');

  // Check plan limits for monthly email allowance
  if (!isTestEmail && org.planLimits) {
    const allowance = org.planLimits.monthlyEmailAllowance || 2000;
    const sentCount = org.planLimits.emailsSentThisMonth || 0;
    if (sentCount >= allowance) {
      throw new Error(`Monthly email allowance exceeded (${sentCount}/${allowance}). Please upgrade your SaaS plan.`);
    }
  }

  // Render template if specified
  let finalSubject = subject;
  let finalHtml = html;
  let finalText = text;

  if (templateType && templateType !== 'custom') {
    const rendered = renderTemplate(templateType, {
      ...templateData,
      brandName: org.name || 'SmartCRM AI',
      customerName: recipientName,
    });
    if (!finalSubject) finalSubject = rendered.subject;
    if (!finalHtml) finalHtml = rendered.html;
    if (!finalText) finalText = rendered.text;
  }

  if (!finalSubject) {
    throw new Error('Email subject is required.');
  }

  const transportInfo = getEmailTransport(org);

  let deliveryStatus = 'sent';
  let providerMessageId = '';
  let deliveryError = '';

  try {
    const sendResult = await transportInfo.transporter.sendMail({
      from: `"${transportInfo.fromName}" <${transportInfo.fromEmail}>`,
      to,
      subject: finalSubject,
      text: finalText,
      html: finalHtml,
    });
    providerMessageId = sendResult.messageId || `msg_${Date.now()}`;
  } catch (err) {
    deliveryStatus = 'failed';
    deliveryError = err.message || 'Delivery error';
  }

  // Increment monthly email counter on success
  if (deliveryStatus === 'sent' && !isTestEmail) {
    await Organization.updateOne(
      { _id: organizationId },
      { $inc: { 'planLimits.emailsSentThisMonth': 1 } }
    );
  }

  // Record durable email delivery audit log
  const logEntry = await EmailLog.create({
    organizationId,
    recipient: { name: recipientName, email: to },
    sender: { name: transportInfo.fromName, email: transportInfo.fromEmail },
    subject: finalSubject,
    htmlBody: finalHtml,
    textBody: finalText,
    templateType,
    status: deliveryStatus,
    provider: transportInfo.provider,
    providerMessageId,
    error: deliveryError,
    relatedEntityType,
    relatedEntityId: relatedEntityId || undefined,
    sentBy: sentBy || undefined,
    sentAt: new Date(),
    isTestEmail,
  });

  await logAudit({
    organizationId,
    userId: sentBy,
    action: 'SEND_EMAIL',
    entityType: 'EmailLog',
    entityId: logEntry._id,
    metadata: { to, subject: finalSubject, status: deliveryStatus, templateType },
  });

  return logEntry;
};

/**
 * Sends a diagnostic test email to verify SMTP configuration
 */
export const sendTestEmail = async ({ organizationId, recipientEmail, sentBy }) => {
  return await sendEmail({
    organizationId,
    to: recipientEmail,
    recipientName: 'Diagnostic Administrator',
    subject: 'Diagnostic Test: SmartCRM Email Service is Operational',
    html: `
      <p>Hello,</p>
      <p>This is a verified test email sent from your <strong>SmartCRM AI</strong> workspace.</p>
      <p>Timestamp: <strong>${new Date().toISOString()}</strong></p>
      <p>If you are seeing this email, your outgoing mail server configuration is fully operational.</p>
    `,
    text: `SmartCRM Diagnostic Test Email. Outgoing mail server is operational. Sent at ${new Date().toISOString()}`,
    templateType: 'custom',
    isTestEmail: true,
    sentBy,
  });
};
