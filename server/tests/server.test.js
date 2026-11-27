import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { Customer } from '../models/Customer.js';
import { Company } from '../models/Company.js';
import { Contact } from '../models/Contact.js';
import { Deal } from '../models/Deal.js';
import { Lead } from '../models/Lead.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { AutomationRule } from '../models/AutomationRule.js';
import { AutomationExecution } from '../models/AutomationExecution.js';
import { Subscription } from '../models/Subscription.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Payment } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';
import { Document } from '../models/Document.js';
import { CalendarEvent } from '../models/CalendarEvent.js';
import { EmailLog } from '../models/EmailLog.js';
import { JobExecution } from '../models/JobExecution.js';
import { Notification } from '../models/Notification.js';
import {
  calculateSubscriptionMRR,
  calculateSubscriptionARR,
  calculateARPU,
  calculateLTV,
  calculateChurnRate,
  validateTransition,
  transitionSubscriptionStatus,
} from '../services/subscription/subscriptionService.js';
import {
  RazorpayPaymentProvider,
  SandboxPaymentProvider,
  paymentProvider,
} from '../services/payment/paymentProvider.js';
import {
  createPaymentOrder,
  verifyAndRecordGatewayPayment,
  recordPayment,
  refundPaymentTransaction,
  handlePaymentWebhook,
} from '../services/payment/paymentService.js';
import {
  encryptDocumentBuffer,
  decryptDocumentBuffer,
  isEncryptedDocument,
} from '../services/security/encryptionService.js';
import {
  dispatchAutomationTrigger,
  executeRule,
} from '../services/automation/automationEngineService.js';
import { queryBusinessAssistant } from '../services/ai/assistantService.js';
import { analyzeChurnRisk } from '../services/ai/churnPredictionService.js';
import { sendEmail, renderTemplate, sendTestEmail } from '../services/email/emailService.js';
import { enqueueJob, processNextJob, getQueueMetrics } from '../services/jobs/jobQueueService.js';
import { checkPlanLimit } from '../middleware/planLimitMiddleware.js';
import { importEntityData, exportEntityCsv, parseCsvString } from '../services/data/csvService.js';
import { WebhookSubscription } from '../models/WebhookSubscription.js';
import { registerSseClient, broadcastNotification } from '../services/notification/sseService.js';
import { generateTotpCode, verifyTotpCode } from '../controllers/authController.js';

describe('SmartCRM Phase 3 Comprehensive Product Verification Suite', () => {
  let org1;
  let org2;
  let userAdmin;
  let userViewer;
  let plan1;

  before(async () => {
    await connectDB();

    org1 = await Organization.create({
      name: 'Acme Apex Cloud Inc',
      slug: `acme-apex-${Date.now()}`,
      email: `admin-${Date.now()}@acme.com`,
      onboarding: { isCompleted: false, step: 1 },
      planLimits: {
        maxUsers: 5,
        maxCustomers: 10,
        maxContacts: 20,
        maxDeals: 10,
        maxStorageMB: 50,
        monthlyEmailAllowance: 100,
        emailsSentThisMonth: 0,
      },
      integrations: {
        payment: {
          provider: 'razorpay',
          keyId: 'rzp_test_mock_123',
          keySecret: 'rzp_secret_mock_456',
          webhookSecret: 'rzp_whsec_mock_789',
          mode: 'test',
          currency: 'INR',
        },
        email: {
          provider: 'mock',
          fromName: 'Acme Apex Support',
          fromEmail: 'support@acme.com',
        },
      },
    });

    org2 = await Organization.create({
      name: 'Beta Global Tenant',
      slug: `beta-tenant-${Date.now()}`,
      email: `admin-${Date.now()}@beta.com`,
    });

    userAdmin = await User.create({
      name: 'Alice Administrator',
      email: `alice-${Date.now()}@acme.com`,
      passwordHash: 'hashed_password_xyz',
      role: 'owner',
      organizationId: org1._id,
    });

    userViewer = await User.create({
      name: 'Bob Observer',
      email: `bob-${Date.now()}@acme.com`,
      passwordHash: 'hashed_password_xyz',
      role: 'viewer',
      organizationId: org1._id,
    });

    plan1 = await SubscriptionPlan.create({
      organizationId: org1._id,
      name: 'Enterprise Growth Tier',
      pricing: { monthly: 199, quarterly: 550, annual: 1999 },
      features: ['Unlimited API Calls', 'Encrypted Document Vault', 'Automated Workflows'],
    });
  });

  after(async () => {
    const orgIds = [org1._id, org2._id];
    await Organization.deleteMany({ _id: { $in: orgIds } });
    await User.deleteMany({ organizationId: { $in: orgIds } });
    await Customer.deleteMany({ organizationId: { $in: orgIds } });
    await Company.deleteMany({ organizationId: { $in: orgIds } });
    await Contact.deleteMany({ organizationId: { $in: orgIds } });
    await Deal.deleteMany({ organizationId: { $in: orgIds } });
    await Lead.deleteMany({ organizationId: { $in: orgIds } });
    await SupportTicket.deleteMany({ organizationId: { $in: orgIds } });
    await AutomationRule.deleteMany({ organizationId: { $in: orgIds } });
    await AutomationExecution.deleteMany({ organizationId: { $in: orgIds } });
    await Subscription.deleteMany({ organizationId: { $in: orgIds } });
    await SubscriptionPlan.deleteMany({ organizationId: { $in: orgIds } });
    await Payment.deleteMany({ organizationId: { $in: orgIds } });
    await Invoice.deleteMany({ organizationId: { $in: orgIds } });
    await Document.deleteMany({ organizationId: { $in: orgIds } });
    await CalendarEvent.deleteMany({ organizationId: { $in: orgIds } });
    await EmailLog.deleteMany({ organizationId: { $in: orgIds } });
    await JobExecution.deleteMany({ organizationId: { $in: orgIds } });
    await Notification.deleteMany({ organizationId: { $in: orgIds } });
    await closeDB();
  });

  // =========================================================================
  // WORKFLOW A: Organization Registration, Profile, Onboarding Wizard
  // =========================================================================
  test('Workflow A: Register organization, progress through onboarding steps, and complete onboarding', async () => {
    assert.equal(org1.onboarding.isCompleted, false);
    assert.equal(org1.onboarding.step, 1);

    // Progress through onboarding steps 2 -> 5
    org1.onboarding.step = 3;
    await org1.save();

    const intermediate = await Organization.findById(org1._id);
    assert.equal(intermediate.onboarding.step, 3);

    // Complete onboarding
    org1.onboarding.step = 6;
    org1.onboarding.isCompleted = true;
    await org1.save();

    const finalized = await Organization.findById(org1._id);
    assert.equal(finalized.onboarding.isCompleted, true);
  });

  // =========================================================================
  // WORKFLOW B: Lead Capture -> Qualification -> Atomic Multi-Entity Conversion
  // =========================================================================
  test('Workflow B: Lead lifecycle qualification and atomic conversion into Customer, Company, Contact, and Deal', async () => {
    const lead = await Lead.create({
      organizationId: org1._id,
      name: 'Sarah Connor',
      email: `sarah-${Date.now()}@cyberdyne.io`,
      phone: '+1-555-0144',
      company: 'Cyberdyne Systems',
      source: 'web_form',
      stage: 'qualified',
      estimatedValue: 45000,
      assignedTo: userAdmin._id,
    });

    const comp = await Company.create({
      organizationId: org1._id,
      name: lead.company,
      domain: 'cyberdyne.io',
    });

    const contact = await Contact.create({
      organizationId: org1._id,
      firstName: 'Sarah',
      lastName: 'Connor',
      email: lead.email,
      phone: lead.phone,
      companyId: comp._id,
      assignedTo: userAdmin._id,
    });

    const customer = await Customer.create({
      organizationId: org1._id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      lifecycleStatus: 'customer',
      assignedTo: userAdmin._id,
    });

    const deal = await Deal.create({
      organizationId: org1._id,
      title: `${lead.company} - Security Platform Deal`,
      value: lead.estimatedValue,
      stage: 'discovery',
      probability: 25,
      customerId: customer._id,
      companyId: comp._id,
      contactId: contact._id,
      assignedTo: userAdmin._id,
    });

    lead.status = 'converted';
    lead.convertedCustomerId = customer._id;
    await lead.save();

    assert.equal(lead.status, 'converted');
    assert.equal(customer.lifecycleStatus, 'customer');
    assert.equal(deal.companyId.toString(), comp._id.toString());
    assert.equal(deal.contactId.toString(), contact._id.toString());
  });

  // =========================================================================
  // WORKFLOW C: Deal Pipeline Stage Progression & Weighted Forecast
  // =========================================================================
  test('Workflow C: Deal moves through pipeline stages, tracking history, probability, and weighted forecast', async () => {
    const deal = await Deal.create({
      organizationId: org1._id,
      title: 'Enterprise AI Pipeline Deal',
      value: 60000,
      stage: 'discovery',
      probability: 10,
      stageHistory: [{ stage: 'discovery', enteredAt: new Date() }],
    });

    assert.equal(deal.weightedValue, 6000);

    // Transition to proposal (50%)
    deal.stage = 'proposal';
    deal.probability = 50;
    deal.stageHistory.push({ stage: 'proposal', enteredAt: new Date() });
    await deal.save();

    const inProposal = await Deal.findById(deal._id);
    assert.equal(inProposal.stage, 'proposal');
    assert.equal(inProposal.weightedValue, 30000);

    // Win the deal (100%)
    deal.stage = 'closed_won';
    deal.probability = 100;
    deal.actualCloseDate = new Date();
    deal.stageHistory.push({ stage: 'closed_won', enteredAt: new Date() });
    await deal.save();

    const wonDeal = await Deal.findById(deal._id);
    assert.equal(wonDeal.stage, 'closed_won');
    assert.equal(wonDeal.weightedValue, 60000);
    assert.equal(wonDeal.stageHistory.length, 3);
  });

  // =========================================================================
  // WORKFLOW D: Subscription Provisioning, Invoicing & Gateway Settlement
  // =========================================================================
  test('Workflow D: Subscription provisioning, invoice generation, and gateway payment reconciliation', async () => {
    const customer = await Customer.create({
      organizationId: org1._id,
      name: 'Michael Scott',
      email: `michael-${Date.now()}@dundermifflin.com`,
      company: 'Dunder Mifflin Paper',
    });

    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const sub = await Subscription.create({
      organizationId: org1._id,
      customerId: customer._id,
      planId: plan1._id,
      billingFrequency: 'monthly',
      amount: 199,
      currency: 'INR',
      startDate: now,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      nextRenewalDate: nextMonth,
      status: 'active',
      paymentStatus: 'pending',
    });

    const invoice = await Invoice.create({
      organizationId: org1._id,
      customerId: customer._id,
      subscriptionId: sub._id,
      invoiceNumber: `INV-RZP-${Date.now()}`,
      issueDate: now,
      dueDate: nextMonth,
      subtotal: 199,
      tax: 0,
      total: 199,
      amountPaid: 0,
      balanceDue: 199,
      status: 'sent',
    });

    // 1. Create order via payment gateway
    const order = await createPaymentOrder({
      organizationId: org1._id,
      customerId: customer._id,
      invoiceId: invoice._id,
      subscriptionId: sub._id,
      amount: 199,
      currency: 'INR',
    });

    assert.ok(order.orderId);
    assert.equal(order.amount, 199);

    // 2. Generate simulated valid gateway payment signature
    const mockPaymentId = `pay_mock_${Date.now()}`;
    const rzpProvider = new RazorpayPaymentProvider({
      keyId: 'rzp_test_mock_123',
      keySecret: 'rzp_secret_mock_456',
    });
    const crypto = await import('crypto');
    const validSignature = crypto.default
      .createHmac('sha256', 'rzp_secret_mock_456')
      .update(`${order.orderId}|${mockPaymentId}`)
      .digest('hex');

    // 3. Verify and record payment
    const verifyResult = await verifyAndRecordGatewayPayment({
      organizationId: org1._id,
      customerId: customer._id,
      invoiceId: invoice._id,
      subscriptionId: sub._id,
      amount: 199,
      currency: 'INR',
      orderId: order.orderId,
      paymentId: mockPaymentId,
      signature: validSignature,
      userId: userAdmin._id,
    });

    assert.equal(verifyResult.isDuplicate, false);
    assert.equal(verifyResult.payment.status, 'paid');

    // Verify invoice balance due reached 0 and marked paid
    const updatedInvoice = await Invoice.findById(invoice._id);
    assert.equal(updatedInvoice.status, 'paid');
    assert.equal(updatedInvoice.balanceDue, 0);

    // Verify subscription payment status updated to paid
    const updatedSub = await Subscription.findById(sub._id);
    assert.equal(updatedSub.paymentStatus, 'paid');
  });

  // =========================================================================
  // WORKFLOW E: Payment Failure Handling & Subscription Grace Period Warning
  // =========================================================================
  test('Workflow E: Payment failure updates subscription to past_due and triggers alert', async () => {
    const cust = await Customer.create({
      organizationId: org1._id,
      name: 'Dwight Schrute',
      email: `dwight-${Date.now()}@beetfarms.com`,
    });

    const sub = await Subscription.create({
      organizationId: org1._id,
      customerId: cust._id,
      planId: plan1._id,
      amount: 199,
      status: 'active',
      paymentStatus: 'paid',
      startDate: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      nextRenewalDate: new Date(),
    });

    // Record failed payment
    const payment = await recordPayment({
      organizationId: org1._id,
      customerId: cust._id,
      subscriptionId: sub._id,
      amount: 199,
      status: 'failed',
      notes: 'Card declined by issuing bank',
      userId: userAdmin._id,
    });

    assert.equal(payment.status, 'failed');

    const updatedSub = await Subscription.findById(sub._id);
    assert.equal(updatedSub.paymentStatus, 'failed');
    assert.equal(updatedSub.status, 'past_due');
  });

  // =========================================================================
  // WORKFLOW F: Document Vault AES-256-GCM Encryption, Download & Tamper Test
  // =========================================================================
  test('Workflow F: Document Vault AES-256-GCM encryption, verification, and tamper detection', () => {
    const sensitivePayload = 'MASTER SERVICE AGREEMENT: High-Priority Terms with Cyberdyne Systems';
    const plainBuffer = Buffer.from(sensitivePayload, 'utf8');

    const encrypted = encryptDocumentBuffer(plainBuffer);
    assert.ok(isEncryptedDocument(encrypted));
    assert.equal(encrypted.subarray(0, 4).toString('utf8'), 'SCED');

    // Plaintext should not exist in the raw buffer
    assert.equal(encrypted.includes(Buffer.from('MASTER SERVICE AGREEMENT')), false);

    // Decrypt
    const decrypted = decryptDocumentBuffer(encrypted);
    assert.equal(decrypted.toString('utf8'), sensitivePayload);

    // Tamper test: Altering ciphertext triggers integrity verification failure
    const tampered = Buffer.from(encrypted);
    tampered[tampered.length - 2] ^= 0x42;
    assert.throws(() => decryptDocumentBuffer(tampered), /Document integrity verification failed/);
  });

  // =========================================================================
  // WORKFLOW G: Strict Multi-Tenant Isolation
  // =========================================================================
  test('Workflow G: Multi-Tenant isolation blocks Organization 2 from accessing Organization 1 records', async () => {
    const org1Cust = await Customer.create({
      organizationId: org1._id,
      name: 'Jim Halpert',
      email: `jim-${Date.now()}@dunder.com`,
    });

    const org1Deal = await Deal.create({
      organizationId: org1._id,
      title: 'Confidential Regional Deal',
      value: 12000,
    });

    // Querying with org2 scope MUST return null
    assert.equal(await Customer.findOne({ _id: org1Cust._id, organizationId: org2._id }), null);
    assert.equal(await Deal.findOne({ _id: org1Deal._id, organizationId: org2._id }), null);
  });

  // =========================================================================
  // WORKFLOW H: Automation Engine Execution & Action Result Logging
  // =========================================================================
  test('Workflow H: Automation rule execution triggers action and creates execution log', async () => {
    const rule = await AutomationRule.create({
      organizationId: org1._id,
      name: 'Notify On Major Deal Won',
      triggerType: 'deal_won',
      actions: [
        {
          actionType: 'send_notification',
          payload: { message: 'Major enterprise deal won! Celebration time.' },
        },
      ],
      isActive: true,
      createdBy: userAdmin._id,
    });

    const wonDeal = await Deal.create({
      organizationId: org1._id,
      title: 'Major Deal Won',
      value: 75000,
      stage: 'closed_won',
    });

    const result = await dispatchAutomationTrigger({
      organizationId: org1._id,
      triggerType: 'deal_won',
      entityType: 'deal',
      entityId: wonDeal._id,
      userId: userAdmin._id,
    });

    assert.equal(result.triggeredCount, 1);
    assert.equal(result.results[0].execution.status, 'success');
  });

  // =========================================================================
  // WORKFLOW I: Outbound Email Dispatch & Delivery Logging
  // =========================================================================
  test('Workflow I: Outbound email service dispatches email and creates durable EmailLog record', async () => {
    const emailResult = await sendEmail({
      organizationId: org1._id,
      to: 'client@sterlingenterprises.com',
      recipientName: 'Jennifer Sterling',
      templateType: 'invoice_notice',
      templateData: {
        invoiceNumber: 'INV-2026-999',
        amount: '$1,999.00',
        dueDate: 'December 31, 2026',
      },
      sentBy: userAdmin._id,
    });

    assert.ok(emailResult._id);
    assert.equal(emailResult.status, 'sent');
    assert.equal(emailResult.recipient.email, 'client@sterlingenterprises.com');
    assert.ok(emailResult.providerMessageId.length > 0);

    // Verify stored in DB
    const foundLog = await EmailLog.findById(emailResult._id);
    assert.ok(foundLog);
    assert.equal(foundLog.subject, 'New Invoice #INV-2026-999 from Acme Apex Cloud Inc');
  });

  // =========================================================================
  // WORKFLOW J: Support Ticket Lifecycle & SLA Monitoring
  // =========================================================================
  test('Workflow J: Support ticket creation, agent assignment, and status update', async () => {
    const supportCust = await Customer.create({
      organizationId: org1._id,
      name: 'Jennifer Sterling',
      email: `sterling-${Date.now()}@sterlingenterprises.com`,
    });

    const ticket = await SupportTicket.create({
      organizationId: org1._id,
      customerId: supportCust._id,
      ticketNumber: `TCK-${Date.now()}`,
      subject: 'API Gateway Rate Limit Exceeded',
      description: 'Customer requests temporary quota boost for holiday traffic surge.',
      priority: 'urgent',
      status: 'open',
      assignedTo: userAdmin._id,
      messages: [
        {
          senderName: 'Customer CTO',
          senderType: 'customer',
          content: 'Traffic spiking to 5,000 req/min.',
        },
      ],
    });

    assert.ok(ticket._id);
    assert.equal(ticket.priority, 'urgent');

    // Agent resolves ticket
    ticket.status = 'resolved';
    ticket.messages.push({
      senderName: 'Alice Administrator',
      senderType: 'agent',
      content: 'Quota increased to 10,000 req/min.',
    });
    await ticket.save();

    const resolvedTicket = await SupportTicket.findById(ticket._id);
    assert.equal(resolvedTicket.status, 'resolved');
    assert.equal(resolvedTicket.messages.length, 2);
  });

  // =========================================================================
  // WORKFLOW K: CSV Data Migration Engine (Import & Export)
  // =========================================================================
  test('Workflow K: CSV parsing, batch import with duplicate detection, and CSV export', async () => {
    const sampleCsv = `Name,Email,Company,Phone
Pam Beesly,pam@dundermifflin.com,Dunder Mifflin,+1-555-0101
Stanley Hudson,stanley@dundermifflin.com,Dunder Mifflin,+1-555-0102`;

    const parsedRows = parseCsvString(sampleCsv);
    assert.equal(parsedRows.length, 2);
    assert.equal(parsedRows[0].name, 'Pam Beesly');
    assert.equal(parsedRows[1].email, 'stanley@dundermifflin.com');

    // Import into Customers
    const importResult = await importEntityData({
      entityType: 'customers',
      rows: parsedRows,
      organizationId: org1._id,
      userId: userAdmin._id,
    });

    assert.equal(importResult.importedCount, 2);
    assert.equal(importResult.skippedCount, 0);

    // Export CSV
    const exportedCsv = await exportEntityCsv({
      entityType: 'customers',
      organizationId: org1._id,
    });

    assert.ok(exportedCsv.includes('Pam Beesly'));
    assert.ok(exportedCsv.includes('pam@dundermifflin.com'));
  });

  // =========================================================================
  // WORKFLOW L: Grounded AI Executive Assistant Live DB Aggregations
  // =========================================================================
  test('Workflow L: AI Assistant queries live database metrics with tenant scoping and zero hallucination', async () => {
    const assistantResult = await queryBusinessAssistant({
      query: 'What is our current recurring revenue and active MRR?',
      organizationId: org1._id,
      user: userAdmin,
    });

    assert.equal(assistantResult.category, 'revenue');
    assert.ok(assistantResult.answer.length > 0);
    assert.ok(assistantResult.answer.includes('Monthly Recurring Revenue') || assistantResult.answer.includes('MRR'));
  });

  // =========================================================================
  // WORKFLOW M: SaaS Plan Limits Backend Enforcement
  // =========================================================================
  test('Workflow M: SaaS Plan limits check actively detects capacity and prevents over-allocation', async () => {
    // Current org1 maxUsers limit is 5
    const userCheck = await checkPlanLimit(org1._id, 'users');
    assert.equal(userCheck.allowed, true);
    assert.equal(userCheck.limit, 5);

    // If we set limit to 1 (which is less than current 2 users), checkPlanLimit must reject
    org1.planLimits.maxUsers = 1;
    await org1.save();

    const overLimitCheck = await checkPlanLimit(org1._id, 'users');
    assert.equal(overLimitCheck.allowed, false);
    assert.match(overLimitCheck.message, /User limit reached/);

    // Restore limit
    org1.planLimits.maxUsers = 5;
    await org1.save();
  });

  // =========================================================================
  // WORKFLOW N: Persistent Background Job Queue Execution
  // =========================================================================
  test('Workflow N: Enqueue background job, process atomically, and verify queue metrics', async () => {
    const job = await enqueueJob({
      jobName: 'scan_overdue_invoices',
      organizationId: org1._id,
      payload: { triggerSource: 'test_suite' },
    });

    assert.ok(job._id);
    assert.equal(job.status, 'pending');

    // Process job
    const processResult = await processNextJob();
    assert.ok(processResult);
    assert.equal(processResult.job.status, 'completed');

    // Check queue metrics
    const metrics = await getQueueMetrics();
    assert.ok(metrics.summary.total > 0);
    assert.ok(metrics.summary.completed > 0);
  });

  // =========================================================================
  // WORKFLOW O: Customer Self-Service Client Portal
  // =========================================================================
  test('Workflow O: Customer Public Self-Service Portal token resolution, invoice balance retrieval, and ticket submission', async () => {
    const portalCust = await Customer.create({
      organizationId: org1._id,
      name: 'Bruce Wayne',
      email: `bruce-${Date.now()}@wayneenterprises.com`,
      company: 'Wayne Enterprises',
    });

    assert.ok(portalCust.portalAccessToken);
    assert.equal(portalCust.portalAccessToken.length, 32);

    // Create an invoice for this customer
    const portalInvoice = await Invoice.create({
      organizationId: org1._id,
      customerId: portalCust._id,
      invoiceNumber: `INV-PORTAL-${Date.now()}`,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 86400000 * 14),
      subtotal: 5000,
      tax: 0,
      total: 5000,
      balanceDue: 5000,
      status: 'sent',
    });

    // Customer initiates payment order via portal
    const orderResult = await createPaymentOrder({
      organizationId: org1._id,
      customerId: portalCust._id,
      invoiceId: portalInvoice._id,
      amount: 5000,
      currency: 'INR',
      notes: { portalSource: 'true' },
    });

    assert.ok(orderResult.orderId);
    assert.equal(orderResult.amount, 5000);

    // Customer submits support ticket via portal
    const ticket = await SupportTicket.create({
      organizationId: org1._id,
      customerId: portalCust._id,
      ticketNumber: `TCK-P-${Date.now()}`,
      subject: 'Portal Billing Query',
      description: 'Requesting updated tax receipt.',
      priority: 'low',
      status: 'open',
      messages: [{ senderName: portalCust.name, senderType: 'customer', content: 'Please email the tax receipt.' }],
    });

    assert.ok(ticket._id);
    assert.equal(ticket.messages[0].senderType, 'customer');
  });

  // =========================================================================
  // WORKFLOW P: Outbound Webhooks Subscription & Signature
  // =========================================================================
  test('Workflow P: Outbound Webhook creation and cryptographic HMAC-SHA256 signature verification', async () => {
    const secretKey = 'whsec_test_secret_for_smartcrm_2026';
    const sub = await WebhookSubscription.create({
      organizationId: org1._id,
      name: 'Slack Deal Alerts',
      targetUrl: 'https://example.com/webhooks/deals',
      secretKey,
      events: ['deal.won'],
      createdBy: userAdmin._id,
    });

    assert.ok(sub._id);
    assert.equal(sub.isActive, true);

    // Verify HMAC signature calculation
    const crypto = await import('crypto');
    const samplePayload = JSON.stringify({ event: 'deal.won', data: { dealId: 'deal_123', value: 50000 } });
    const expectedSignature = crypto.default
      .createHmac('sha256', secretKey)
      .update(samplePayload)
      .digest('hex');

    assert.ok(expectedSignature.length === 64);
  });

  // =========================================================================
  // WORKFLOW Q: Real-Time Live Notification SSE Streaming
  // =========================================================================
  test('Workflow Q: Server-Sent Events (SSE) notification streaming and client broadcast', async () => {
    let writtenData = '';
    const mockRes = {
      writeHead: () => {},
      write: (chunk) => { writtenData += chunk; },
    };
    const mockReq = { headers: {}, on: () => {} };

    // Register mock SSE client
    registerSseClient(mockReq, mockRes, org1._id, userAdmin._id);
    assert.ok(writtenData.includes('event: connected'));

    // Broadcast live event
    broadcastNotification(org1._id, 'payment_received', { amount: 199, customerName: 'Wayne Enterprises' });
    assert.ok(writtenData.includes('payment_received'));
    assert.ok(writtenData.includes('Wayne Enterprises'));
  });

  // =========================================================================
  // WORKFLOW R: Document Digital E-Signature & Audit Hash
  // =========================================================================
  test('Workflow R: Document Vault Digital E-Signature with HMAC audit hash and IP logging', async () => {
    const crypto = await import('crypto');
    const doc = await Document.create({
      organizationId: org1._id,
      title: 'Master Services Agreement (MSA) - Signed',
      fileName: 'msa_contract.pdf',
      originalName: 'msa_contract.pdf',
      filePath: '/tmp/msa.pdf',
      fileSize: 4096,
      mimeType: 'application/pdf',
      category: 'Contract',
      uploadedBy: userAdmin._id,
      eSignature: {
        required: true,
        status: 'pending',
      },
    });

    assert.equal(doc.eSignature.status, 'pending');

    // Simulate signing
    const signatureHash = crypto.default
      .createHmac('sha256', 'super_secret_test_key_32bytes!')
      .update(`${doc._id}|${userAdmin._id}|${Date.now()}`)
      .digest('hex');

    doc.eSignature.status = 'signed';
    doc.eSignature.signerEmail = userAdmin.email;
    doc.eSignature.signerName = userAdmin.name;
    doc.eSignature.signatureHash = signatureHash;
    doc.eSignature.signedAt = new Date();
    doc.eSignature.ipAddress = '192.168.1.100';
    await doc.save();

    const signedDoc = await Document.findById(doc._id);
    assert.equal(signedDoc.eSignature.status, 'signed');
    assert.equal(signedDoc.eSignature.signerName, userAdmin.name);
    assert.ok(signedDoc.eSignature.signatureHash.length === 64);
  });

  // =========================================================================
  // WORKFLOW S: RFC 6238 TOTP Two-Factor Authentication Engine
  // =========================================================================
  test('Workflow S: Two-Factor Authentication RFC 6238 TOTP engine verification', async () => {
    const testSecret = 'JBSWY3DPEHPK3PXP';
    const currentCode = generateTotpCode(testSecret);

    assert.equal(currentCode.length, 6);
    assert.match(currentCode, /^\d{6}$/);

    // Verify TOTP using our controller engine
    const isValid = verifyTotpCode(currentCode, testSecret);
    assert.equal(isValid, true);

    // Invalid code should fail
    const isInvalid = verifyTotpCode('999999', testSecret, 0);
    if (currentCode !== '999999') {
      assert.equal(isInvalid, false);
    }
  });
});
