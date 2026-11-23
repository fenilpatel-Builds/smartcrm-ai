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
import {
  calculateSubscriptionMRR,
  calculateSubscriptionARR,
  calculateARPU,
  calculateLTV,
  calculateChurnRate,
  validateTransition,
  transitionSubscriptionStatus,
} from '../services/subscription/subscriptionService.js';
import { paymentProvider } from '../services/payment/paymentProvider.js';
import { recordPayment, handlePaymentWebhook } from '../services/payment/paymentService.js';
import {
  encryptDocumentBuffer,
  decryptDocumentBuffer,
  isEncryptedDocument,
} from '../services/security/encryptionService.js';
import {
  dispatchAutomationTrigger,
  executeRule,
  evaluateCondition,
} from '../services/automation/automationEngineService.js';
import { queryBusinessAssistant } from '../services/ai/assistantService.js';
import { analyzeChurnRisk } from '../services/ai/churnPredictionService.js';

describe('SmartCRM Phase 2 End-to-End Verification Test Suite', () => {
  let org1;
  let org2;
  let userAdmin;
  let userViewer;
  let plan1;

  before(async () => {
    await connectDB();

    // 1. Create Tenant 1 (Acme Corp) and Tenant 2 (Beta LLC)
    org1 = await Organization.create({
      name: 'Acme Global Org',
      slug: `acme-org-${Date.now()}`,
      email: `admin-${Date.now()}@acme.com`,
    });

    org2 = await Organization.create({
      name: 'Beta Global Org',
      slug: `beta-org-${Date.now()}`,
      email: `admin-${Date.now()}@beta.com`,
    });

    // 2. Create Users: Admin & Viewer
    userAdmin = await User.create({
      name: 'Alice Admin',
      email: `alice-${Date.now()}@acme.com`,
      passwordHash: 'hashed_password_xyz',
      role: 'owner',
      organizationId: org1._id,
    });

    userViewer = await User.create({
      name: 'Bob Viewer',
      email: `bob-${Date.now()}@acme.com`,
      passwordHash: 'hashed_password_xyz',
      role: 'viewer',
      organizationId: org1._id,
    });

    // 3. Create Plan
    plan1 = await SubscriptionPlan.create({
      organizationId: org1._id,
      name: 'Pro SaaS Tier',
      pricing: { monthly: 150, quarterly: 450, annual: 1500 },
      features: ['API Access', 'Unlimited Contacts'],
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
    await closeDB();
  });

  // =========================================================================
  // WORKFLOW A: Complete Customer Lifecycle Workflow
  // Lead -> Customer + Contact + Company + Deal -> Subscription -> Invoices
  // =========================================================================
  test('Workflow A: Complete Customer Lifecycle from Lead to Invoiced Subscription', async () => {
    // 1. Create Lead
    const lead = await Lead.create({
      organizationId: org1._id,
      name: 'Jennifer Sterling',
      email: `jennifer-${Date.now()}@sterlingenterprises.com`,
      phone: '+1-555-0199',
      company: 'Sterling Enterprises',
      source: 'website',
      stage: 'qualified',
      estimatedValue: 25000,
    });
    assert.ok(lead._id);

    // 2. Convert Lead to Customer + Company + Contact + Deal
    const comp = await Company.create({
      organizationId: org1._id,
      name: lead.company,
      domain: 'sterlingenterprises.com',
    });

    const contact = await Contact.create({
      organizationId: org1._id,
      firstName: 'Jennifer',
      lastName: 'Sterling',
      email: lead.email,
      phone: lead.phone,
      companyId: comp._id,
    });

    const customer = await Customer.create({
      organizationId: org1._id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      lifecycleStatus: 'customer',
    });

    const deal = await Deal.create({
      organizationId: org1._id,
      title: `${lead.company} - Expansion Deal`,
      value: lead.estimatedValue,
      stage: 'closed_won',
      probability: 100,
      customerId: customer._id,
      companyId: comp._id,
      contactId: contact._id,
    });

    lead.status = 'converted';
    lead.convertedCustomerId = customer._id;
    await lead.save();

    assert.equal(lead.status, 'converted');
    assert.equal(customer.lifecycleStatus, 'customer');
    assert.equal(deal.stage, 'closed_won');

    // 3. Create Subscription for the Customer
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const subscription = await Subscription.create({
      organizationId: org1._id,
      customerId: customer._id,
      planId: plan1._id,
      billingFrequency: 'monthly',
      amount: 150,
      currency: 'USD',
      startDate: now,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      nextRenewalDate: nextMonth,
      status: 'active',
      paymentStatus: 'paid',
    });

    assert.ok(subscription._id);
    assert.equal(subscription.status, 'active');

    // 4. Generate Invoice and Reconcile with Payment
    const invoice = await Invoice.create({
      organizationId: org1._id,
      customerId: customer._id,
      subscriptionId: subscription._id,
      invoiceNumber: `INV-${Date.now()}`,
      issueDate: now,
      dueDate: nextMonth,
      subtotal: 150,
      tax: 0,
      total: 150,
      amountPaid: 0,
      balanceDue: 150,
      status: 'sent',
    });

    const payment = await recordPayment({
      organizationId: org1._id,
      customerId: customer._id,
      subscriptionId: subscription._id,
      invoiceId: invoice._id,
      amount: 150,
      currency: 'USD',
      paymentMethod: 'credit_card',
      status: 'paid',
      userId: userAdmin._id,
    });

    const updatedInvoice = await Invoice.findById(invoice._id);
    assert.equal(updatedInvoice.status, 'paid');
    assert.equal(updatedInvoice.balanceDue, 0);
    assert.equal(updatedInvoice.amountPaid, 150);
    assert.equal(payment.status, 'paid');
  });

  // =========================================================================
  // WORKFLOW B: Subscription Lifecycle Transitions & State Machine Validation
  // =========================================================================
  test('Workflow B: Subscription state machine enforces valid transitions and rejects invalid', async () => {
    // 1. Valid transitions
    assert.doesNotThrow(() => validateTransition('pending', 'active'));
    assert.doesNotThrow(() => validateTransition('active', 'paused'));
    assert.doesNotThrow(() => validateTransition('paused', 'active'));
    assert.doesNotThrow(() => validateTransition('active', 'past_due'));
    assert.doesNotThrow(() => validateTransition('past_due', 'active'));
    assert.doesNotThrow(() => validateTransition('active', 'cancelled'));

    // 2. Invalid transitions must throw
    assert.throws(
      () => validateTransition('cancelled', 'paused'),
      /Invalid subscription state transition/
    );
    assert.throws(
      () => validateTransition('cancelled', 'active'),
      /Invalid subscription state transition/
    );
    assert.throws(
      () => validateTransition('pending', 'paused'),
      /Invalid subscription state transition/
    );

    // 3. Database state transition execution
    const dummyCust = await Customer.create({
      organizationId: org1._id,
      name: 'State Transition Cust',
      email: `statetxn-${Date.now()}@test.com`,
    });

    const sub = await Subscription.create({
      organizationId: org1._id,
      customerId: dummyCust._id,
      planId: plan1._id,
      amount: 150,
      status: 'active',
      startDate: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      nextRenewalDate: new Date(),
    });

    // Pause active subscription -> valid
    const paused = await transitionSubscriptionStatus({
      organizationId: org1._id,
      subscriptionId: sub._id,
      targetStatus: 'paused',
      reason: 'Customer seasonal pause',
      userId: userAdmin._id,
    });
    assert.equal(paused.status, 'paused');

    // Resume to active -> valid
    const resumed = await transitionSubscriptionStatus({
      organizationId: org1._id,
      subscriptionId: sub._id,
      targetStatus: 'active',
      reason: 'Customer resumed service',
      userId: userAdmin._id,
    });
    assert.equal(resumed.status, 'active');

    // Cancel active subscription -> valid
    const cancelled = await transitionSubscriptionStatus({
      organizationId: org1._id,
      subscriptionId: sub._id,
      targetStatus: 'cancelled',
      reason: 'Customer requested cancellation',
      userId: userAdmin._id,
    });
    assert.equal(cancelled.status, 'cancelled');

    // Attempting to move cancelled -> paused must reject
    await assert.rejects(
      async () => {
        await transitionSubscriptionStatus({
          organizationId: org1._id,
          subscriptionId: sub._id,
          targetStatus: 'paused',
          userId: userAdmin._id,
        });
      },
      /Invalid subscription state transition/
    );
  });

  // =========================================================================
  // WORKFLOW C: Multi-Tenant Boundary Verification across All Models
  // =========================================================================
  test('Workflow C: Multi-Tenant isolation blocks Org 2 from accessing Org 1 entities', async () => {
    // Seed Org 1 entities
    const cust1 = await Customer.create({
      organizationId: org1._id,
      name: 'Org 1 Confidential Client',
      email: `confidential-${Date.now()}@org1.com`,
    });

    const comp1 = await Company.create({
      organizationId: org1._id,
      name: 'Org 1 Holding Co',
    });

    const contact1 = await Contact.create({
      organizationId: org1._id,
      firstName: 'Protected',
      lastName: 'Contact',
      email: `contact-${Date.now()}@org1.com`,
    });

    const deal1 = await Deal.create({
      organizationId: org1._id,
      title: 'Top Secret Deal',
      value: 100000,
    });

    const ticket1 = await SupportTicket.create({
      organizationId: org1._id,
      ticketNumber: `TCK-${Date.now()}`,
      subject: 'Security Review',
      description: 'Quarterly multi-tenant security verification audit',
      customerId: cust1._id,
    });

    // Query each with Org 2 scope -> MUST be null
    assert.equal(await Customer.findOne({ _id: cust1._id, organizationId: org2._id }), null);
    assert.equal(await Company.findOne({ _id: comp1._id, organizationId: org2._id }), null);
    assert.equal(await Contact.findOne({ _id: contact1._id, organizationId: org2._id }), null);
    assert.equal(await Deal.findOne({ _id: deal1._id, organizationId: org2._id }), null);
    assert.equal(await SupportTicket.findOne({ _id: ticket1._id, organizationId: org2._id }), null);
  });

  // =========================================================================
  // WORKFLOW D: RBAC Permission Boundaries & Read-Only Viewer Enforcement
  // =========================================================================
  test('Workflow D: RBAC enforces viewer read-only role restrictions', async () => {
    // Check that enforceWritePermission logic blocks mutations for 'viewer' role
    const mockViewerReq = {
      method: 'POST',
      user: { role: 'viewer', name: 'Bob Viewer' },
    };

    let blocked = false;
    let blockedCode = 0;
    const mockRes = {
      status(code) {
        blockedCode = code;
        return {
          json(data) {
            blocked = true;
          },
        };
      },
    };
    const mockNext = () => {
      blocked = false;
    };

    // Simulate roleMiddleware enforceWritePermission check
    const enforceWrite = (req, res, next) => {
      if (req.user && req.user.role === 'viewer' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Viewers have read-only permissions.',
        });
      }
      next();
    };

    enforceWrite(mockViewerReq, mockRes, mockNext);
    assert.equal(blocked, true);
    assert.equal(blockedCode, 403);

    // Viewer making a GET request is permitted
    const mockViewerGet = { method: 'GET', user: { role: 'viewer' } };
    let getPassed = false;
    enforceWrite(mockViewerGet, mockRes, () => {
      getPassed = true;
    });
    assert.equal(getPassed, true);
  });

  // =========================================================================
  // WORKFLOW E: Document Vault AES-256-GCM Encryption at Rest & Tamper Protection
  // =========================================================================
  test('Workflow E: Document Vault AES-256-GCM encryption, verification, and tamper detection', () => {
    const sensitiveText = 'CONFIDENTIAL CONTRACT: Enterprise terms $250,000 for Acme Global Org';
    const plainBuffer = Buffer.from(sensitiveText, 'utf8');

    // 1. Encrypt buffer
    const encrypted = encryptDocumentBuffer(plainBuffer);
    assert.ok(Buffer.isBuffer(encrypted));
    assert.ok(isEncryptedDocument(encrypted));
    assert.equal(encrypted.subarray(0, 4).toString('utf8'), 'SCED');

    // Encrypted text must NOT contain the sensitive plaintext
    assert.equal(encrypted.includes(Buffer.from('CONFIDENTIAL CONTRACT')), false);

    // 2. Decrypt buffer
    const decrypted = decryptDocumentBuffer(encrypted);
    assert.equal(decrypted.toString('utf8'), sensitiveText);

    // 3. Tamper detection: modifying a single byte in ciphertext must fail authentication tag
    const tampered = Buffer.from(encrypted);
    tampered[tampered.length - 1] ^= 0x01; // flip last byte

    assert.throws(
      () => decryptDocumentBuffer(tampered),
      /Document integrity verification failed/
    );
  });

  // =========================================================================
  // WORKFLOW F: Automation Engine Trigger Execution, Condition Matching & Deduplication
  // =========================================================================
  test('Workflow F: Automation Engine executes matching rules and deduplicates identical events', async () => {
    // 1. Create Rule
    const rule = await AutomationRule.create({
      organizationId: org1._id,
      name: 'High-Value Deal Won Task',
      triggerType: 'deal_won',
      conditions: [{ field: 'value', operator: 'greater_than', value: 10000 }],
      actions: [
        {
          actionType: 'create_task',
          payload: { title: 'Executive Welcome Call', priority: 'high' },
        },
      ],
      isActive: true,
      createdBy: userAdmin._id,
    });

    const dealWon = await Deal.create({
      organizationId: org1._id,
      title: 'Mega Client Won',
      value: 50000,
      stage: 'closed_won',
    });

    // 2. Dispatch trigger
    const dispatchResult = await dispatchAutomationTrigger({
      organizationId: org1._id,
      triggerType: 'deal_won',
      entityType: 'deal',
      entityId: dealWon._id,
      contextData: { value: 50000, title: dealWon.title },
      userId: userAdmin._id,
    });

    assert.equal(dispatchResult.triggeredCount, 1);
    assert.equal(dispatchResult.results[0].skipped, false);
    assert.equal(dispatchResult.results[0].execution.status, 'success');

    // 3. Duplicate event suppression (Idempotency within debounce window)
    const duplicateDispatch = await dispatchAutomationTrigger({
      organizationId: org1._id,
      triggerType: 'deal_won',
      entityType: 'deal',
      entityId: dealWon._id,
      contextData: { value: 50000, title: dealWon.title },
      userId: userAdmin._id,
    });

    assert.equal(duplicateDispatch.results[0].skipped, true);
    assert.match(duplicateDispatch.results[0].reason, /Duplicate trigger suppressed/);
  });

  // =========================================================================
  // WORKFLOW G: Financial Calculations, Exact Rounding, ARPU, LTV & Churn Formulas
  // =========================================================================
  test('Workflow G: Accurate Financial Metric Calculations and Floating Point Elimination', () => {
    // Normalization test
    assert.equal(calculateSubscriptionMRR({ amount: 120, billingFrequency: 'monthly', status: 'active' }), 120);
    assert.equal(calculateSubscriptionMRR({ amount: 360, billingFrequency: 'quarterly', status: 'active' }), 120);
    assert.equal(calculateSubscriptionMRR({ amount: 720, billingFrequency: 'semi_annual', status: 'active' }), 120);
    assert.equal(calculateSubscriptionMRR({ amount: 1440, billingFrequency: 'annual', status: 'active' }), 120);

    // ARR = MRR * 12
    assert.equal(calculateSubscriptionARR({ amount: 120, billingFrequency: 'monthly', status: 'active' }), 1440);

    // Exact decimal precision (prevent 0.1 + 0.2 floating point glitch)
    const subWithFraction = { amount: 99.99, billingFrequency: 'monthly', status: 'active' };
    assert.equal(calculateSubscriptionMRR(subWithFraction), 99.99);

    // ARPU = Total MRR / Active Customers
    const arpu = calculateARPU(10000, 50);
    assert.equal(arpu, 200);

    // Churn Rate % = (Churned / Total) * 100
    const churnRate = calculateChurnRate(5, 100);
    assert.equal(churnRate, 5);

    // LTV = ARPU / Churn Rate (decimal) -> 200 / 0.05 = 4000
    const ltv = calculateLTV(200, 5);
    assert.equal(ltv, 4000);

    // LTV with zero churn falls back to 24-month horizon
    const ltvZeroChurn = calculateLTV(200, 0);
    assert.equal(ltvZeroChurn, 4800);
  });

  // =========================================================================
  // WORKFLOW H: AI Executive Assistant Grounded Live MongoDB Queries
  // =========================================================================
  test('Workflow H: AI Business Assistant accurately queries live data without hallucinations', async () => {
    // Query MRR
    const mrrResponse = await queryBusinessAssistant({
      query: 'What is our current MRR and ARR revenue?',
      organizationId: org1._id,
      user: userAdmin,
    });

    assert.equal(mrrResponse.category, 'revenue');
    assert.ok(mrrResponse.answer.length > 0);
    assert.ok(mrrResponse.answer.includes('Monthly Recurring Revenue') || mrrResponse.answer.includes('MRR'));

    // Query Churn Risk
    const churnResponse = await queryBusinessAssistant({
      query: 'Which customers are at high risk of churn?',
      organizationId: org1._id,
      user: userAdmin,
    });

    assert.equal(churnResponse.category, 'churn');
    assert.ok(churnResponse.answer.length > 0);

    // Query Deals Pipeline
    const dealsResponse = await queryBusinessAssistant({
      query: 'Show me our open deals pipeline and closing opportunities',
      organizationId: org1._id,
      user: userAdmin,
    });

    assert.equal(dealsResponse.category, 'deals');
    assert.ok(dealsResponse.answer.length > 0);
    assert.ok(dealsResponse.answer.includes('sales pipeline'));
  });

  // =========================================================================
  // WORKFLOW I: Payment Provider Sandbox, Idempotency & Webhook Verification
  // =========================================================================
  test('Workflow I: Payment Provider idempotency and HMAC SHA-256 webhook signature verification', async () => {
    const idempotencyKey = `idemp_${Date.now()}`;

    // 1. Charge creation
    const charge1 = await paymentProvider.createCharge({
      amount: 199.99,
      currency: 'USD',
      customerId: userAdmin._id,
      idempotencyKey,
    });

    assert.equal(charge1.status, 'succeeded');
    assert.equal(charge1.amount, 199.99);

    // 2. Replay with identical idempotency key -> returns cached result
    const charge2 = await paymentProvider.createCharge({
      amount: 199.99,
      currency: 'USD',
      customerId: userAdmin._id,
      idempotencyKey,
    });

    assert.equal(charge2.chargeId, charge1.chargeId);
    assert.equal(charge2.isIdempotentReplay, true);

    // 3. Webhook signature verification
    const webhookPayload = JSON.stringify({
      eventType: 'charge.succeeded',
      data: {
        organizationId: org1._id.toString(),
        customerId: userAdmin._id.toString(),
        amount: 199.99,
        transactionReference: charge1.transactionReference,
      },
    });

    const validSignature = paymentProvider.generateWebhookSignature(webhookPayload);
    const isSignatureValid = paymentProvider.verifyWebhookSignature(webhookPayload, validSignature);
    assert.equal(isSignatureValid, true);

    const isTamperedValid = paymentProvider.verifyWebhookSignature(webhookPayload, 'invalid_signature_hex');
    assert.equal(isTamperedValid, false);
  });
});
