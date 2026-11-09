import { Customer } from '../../models/Customer.js';
import { Subscription } from '../../models/Subscription.js';
import { Invoice } from '../../models/Invoice.js';
import { Organization } from '../../models/Organization.js';
import { callAI } from './aiClient.js';

export const generateCustomerMessage = async ({
  customerId,
  organizationId,
  messageType = 'follow_up', // follow_up, payment_reminder, renewal_reminder, upgrade_proposal, retention
  tone = 'professional',
  customInstructions = '',
  senderName = 'The Customer Success Team',
}) => {
  const customer = await Customer.findOne({ _id: customerId, organizationId });
  if (!customer) throw new Error('Customer not found');

  const org = await Organization.findById(organizationId);
  const companyName = org?.name || 'SmartCRM';

  const subscription = await Subscription.findOne({
    customerId,
    organizationId,
    status: { $in: ['active', 'past_due', 'paused', 'trial'] },
  }).populate('planId');

  const overdueInvoices = await Invoice.find({
    customerId,
    organizationId,
    dueDate: { $lt: new Date() },
    balanceDue: { $gt: 0 },
  });
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

  let subject = '';
  let body = '';

  switch (messageType) {
    case 'payment_reminder':
      subject = `Urgent: Outstanding Balance Reminder for ${customer.company || customer.name} [${companyName}]`;
      body = `Hi ${customer.name},\n\nWe hope this email finds you well.\n\nOur records show an outstanding balance of $${totalOverdue.toFixed(
        2
      )} across ${overdueInvoices.length} invoice(s) for your account with ${companyName}.\n\nTo ensure uninterrupted service and support, please review and settle this balance at your earliest convenience. You can view your invoice directly in your account portal.\n\nIf you have already processed this payment or require billing assistance, please feel free to reach out to us.\n\nWarm regards,\n${senderName}\n${companyName}`;
      break;

    case 'renewal_reminder':
      const renewalDateStr = subscription?.nextRenewalDate
        ? new Date(subscription.nextRenewalDate).toLocaleDateString()
        : 'in the coming weeks';
      subject = `Your upcoming subscription renewal with ${companyName}`;
      body = `Hi ${customer.name},\n\nWe wanted to reach out and let you know that your subscription to the ${
        subscription?.planId?.name || 'active'
      } plan is scheduled for renewal on ${renewalDateStr}.\n\nWe truly appreciate having ${
        customer.company || 'your team'
      } as our valued customer. If you have any questions about your plan features, team seats, or billing preferences, we'd be glad to arrange a quick check-in call.\n\nThank you for choosing ${companyName}.\n\nBest regards,\n${senderName}\n${companyName}`;
      break;

    case 'upgrade_proposal':
      subject = `Exclusive Upgrade Proposal: Unlock Advanced Capabilities for ${customer.company || customer.name}`;
      body = `Hi ${customer.name},\n\nI hope your week is off to a great start!\n\nSeeing ${
        customer.company || 'your business'
      }'s consistent progress, we believe transitioning your account to our advanced tier would deliver significant leverage—including higher throughput limits, priority support, and enterprise automation features.\n\nWould you be open to a 10-minute discovery call this week to review how the upgrade aligns with your current roadmap?\n\nLooking forward to speaking with you.\n\nBest regards,\n${senderName}\n${companyName}`;
      break;

    case 'retention':
      subject = `Checking in: How can we better support ${customer.company || customer.name}?`;
      body = `Hi ${customer.name},\n\nWe noticed there hasn't been much activity on your account recently, and we wanted to personally reach out to make sure everything is running smoothly.\n\nYour success is our top priority. If there are features you are finding challenging, workflows you'd like guidance on, or specific goals you want to accomplish, I would love to hop on a call and help you get the most out of ${companyName}.\n\nPlease let us know what time works best for you this week.\n\nSincerely,\n${senderName}\n${companyName}`;
      break;

    case 'follow_up':
    default:
      subject = `Following up with ${customer.company || customer.name} - ${companyName}`;
      body = `Hi ${customer.name},\n\nI'm following up regarding our recent conversation. We want to ensure you have all the information and assistance you need to achieve your goals with ${companyName}.\n\nPlease let me know if you have any questions or if we should schedule a brief follow-up discussion at your convenience.\n\nWarm regards,\n${senderName}\n${companyName}`;
      break;
  }

  // If LLM is available, enrich with personalized tone and custom instructions
  const aiPrompt = `Generate a CRM email draft:
Recipient: ${customer.name} (${customer.company || 'Customer'})
Type: ${messageType}
Tone: ${tone}
Company: ${companyName}
Context: ${customInstructions || 'Standard professional outreach'}
Base draft:
Subject: ${subject}
Body: ${body}

Return JSON with keys:
- subject: refined subject line
- body: refined email body ready to send`;

  const aiResult = await callAI({
    prompt: aiPrompt,
    systemPrompt: 'You are an expert enterprise SaaS customer relationship manager. Craft professional, compelling, empathetic communications.',
    responseFormat: 'json',
  });

  if (aiResult?.subject && aiResult?.body) {
    subject = aiResult.subject;
    body = aiResult.body;
  }

  return {
    customerId,
    messageType,
    tone,
    subject,
    body,
  };
};
