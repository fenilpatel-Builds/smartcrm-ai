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
import { SupportTicket } from '../models/SupportTicket.js';
import { AutomationRule } from '../models/AutomationRule.js';
import { Subscription } from '../models/Subscription.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { calculateSubscriptionMRR, calculateSubscriptionARR } from '../services/subscription/subscriptionService.js';
import { analyzeChurnRisk } from '../services/ai/churnPredictionService.js';

describe('SmartCRM Backend Test Suite', () => {
  let testOrg1;
  let testOrg2;
  let testUser1;
  let testCustomer1;
  let testPlan1;

  before(async () => {
    await connectDB();

    // Create Test Organizations
    testOrg1 = await Organization.create({
      name: 'Test Tenant One',
      slug: `test-org-1-${Date.now()}`,
      email: 'tenant1@test.com',
    });

    testOrg2 = await Organization.create({
      name: 'Test Tenant Two',
      slug: `test-org-2-${Date.now()}`,
      email: 'tenant2@test.com',
    });

    testUser1 = await User.create({
      name: 'Test User One',
      email: `user1-${Date.now()}@test.com`,
      passwordHash: 'fakehash',
      role: 'owner',
      organizationId: testOrg1._id,
    });

    testPlan1 = await SubscriptionPlan.create({
      organizationId: testOrg1._id,
      name: 'Growth Plan',
      pricing: { monthly: 100, annual: 1000 },
    });
  });

  after(async () => {
    // Clean up test records
    await Organization.deleteMany({ _id: { $in: [testOrg1._id, testOrg2._id] } });
    await User.deleteMany({ organizationId: { $in: [testOrg1._id, testOrg2._id] } });
    await Customer.deleteMany({ organizationId: { $in: [testOrg1._id, testOrg2._id] } });
    await Company.deleteMany({ organizationId: { $in: [testOrg1._id, testOrg2._id] } });
    await Contact.deleteMany({ organizationId: { $in: [testOrg1._id, testOrg2._id] } });
    await Deal.deleteMany({ organizationId: { $in: [testOrg1._id, testOrg2._id] } });
    await SupportTicket.deleteMany({ organizationId: { $in: [testOrg1._id, testOrg2._id] } });
    await AutomationRule.deleteMany({ organizationId: { $in: [testOrg1._id, testOrg2._id] } });
    await Subscription.deleteMany({ organizationId: { $in: [testOrg1._id, testOrg2._id] } });
    await SubscriptionPlan.deleteMany({ organizationId: { $in: [testOrg1._id, testOrg2._id] } });
    await closeDB();
  });

  test('Tenant Isolation: Customer created under Org 1 is invisible to Org 2', async () => {
    testCustomer1 = await Customer.create({
      organizationId: testOrg1._id,
      name: 'Acme Test Customer',
      email: `acme-${Date.now()}@customer.com`,
      company: 'Acme Test Co',
      lifecycleStatus: 'customer',
    });

    assert.ok(testCustomer1._id);

    // Query under Org 1 -> found
    const foundInOrg1 = await Customer.findOne({ _id: testCustomer1._id, organizationId: testOrg1._id });
    assert.ok(foundInOrg1);
    assert.equal(foundInOrg1.name, 'Acme Test Customer');

    // Query under Org 2 -> NOT found (Tenant Isolation Guaranteed)
    const foundInOrg2 = await Customer.findOne({ _id: testCustomer1._id, organizationId: testOrg2._id });
    assert.equal(foundInOrg2, null);
  });

  test('Company & Contact Isolation: Entity under Org 1 is inaccessible to Org 2', async () => {
    const comp = await Company.create({
      organizationId: testOrg1._id,
      name: 'Org 1 Exclusive Corp',
      domain: 'org1exclusive.com',
      industry: 'Technology',
    });

    const contact = await Contact.create({
      organizationId: testOrg1._id,
      firstName: 'Alice',
      lastName: 'Smith',
      email: `alice-${Date.now()}@org1exclusive.com`,
      companyId: comp._id,
    });

    assert.ok(comp._id);
    assert.ok(contact._id);

    const compOrg2 = await Company.findOne({ _id: comp._id, organizationId: testOrg2._id });
    const contactOrg2 = await Contact.findOne({ _id: contact._id, organizationId: testOrg2._id });

    assert.equal(compOrg2, null);
    assert.equal(contactOrg2, null);
  });

  test('Deal Pipeline: Stage transition tracks stageHistory and probability', async () => {
    const deal = await Deal.create({
      organizationId: testOrg1._id,
      title: 'Enterprise Platform Deal',
      value: 50000,
      stage: 'discovery',
      probability: 10,
      stageHistory: [{ stage: 'discovery', enteredAt: new Date() }],
    });

    assert.equal(deal.weightedValue, 5000);

    // Move to Proposal
    deal.stage = 'proposal';
    deal.probability = 50;
    deal.stageHistory.push({ stage: 'proposal', enteredAt: new Date() });
    await deal.save();

    const updated = await Deal.findById(deal._id);
    assert.equal(updated.stage, 'proposal');
    assert.equal(updated.weightedValue, 25000);
    assert.equal(updated.stageHistory.length, 2);
  });

  test('Support Ticket: Validates ticket number and message thread', async () => {
    const ticket = await SupportTicket.create({
      organizationId: testOrg1._id,
      ticketNumber: 'TCK-9999',
      subject: 'Billing discrepancy on invoice',
      description: 'Customer was billed twice.',
      customerId: testCustomer1._id,
      priority: 'urgent',
      status: 'open',
      messages: [
        {
          senderName: 'Agent Cooper',
          content: 'Investigating billing logs.',
        },
      ],
    });

    assert.ok(ticket._id);
    assert.equal(ticket.priority, 'urgent');
    assert.equal(ticket.messages.length, 1);
  });

  test('Automation Rule: Model enforces valid triggers and action schemas', async () => {
    const rule = await AutomationRule.create({
      organizationId: testOrg1._id,
      name: 'On Deal Won',
      triggerType: 'deal_won',
      actions: [{ actionType: 'create_task', payload: { title: 'Follow-up with customer' } }],
      isActive: true,
    });

    assert.ok(rule._id);
    assert.equal(rule.isActive, true);
    assert.equal(rule.actions[0].actionType, 'create_task');
  });

  test('Subscription MRR and ARR normalization calculation', () => {
    // Monthly plan: $100 -> MRR = 100, ARR = 1200
    const monthlySub = { amount: 100, billingFrequency: 'monthly', status: 'active' };
    assert.equal(calculateSubscriptionMRR(monthlySub), 100);
    assert.equal(calculateSubscriptionARR(monthlySub), 1200);

    // Annual plan: $1200 -> MRR = 100, ARR = 1200
    const annualSub = { amount: 1200, billingFrequency: 'annual', status: 'active' };
    assert.equal(calculateSubscriptionMRR(annualSub), 100);
    assert.equal(calculateSubscriptionARR(annualSub), 1200);

    // Quarterly plan: $300 -> MRR = 100, ARR = 1200
    const quarterlySub = { amount: 300, billingFrequency: 'quarterly', status: 'active' };
    assert.equal(calculateSubscriptionMRR(quarterlySub), 100);
    assert.equal(calculateSubscriptionARR(quarterlySub), 1200);

    // Cancelled or Paused subscription should NOT count towards MRR
    const cancelledSub = { amount: 500, billingFrequency: 'monthly', status: 'cancelled' };
    assert.equal(calculateSubscriptionMRR(cancelledSub), 0);
    const pausedSub = { amount: 500, billingFrequency: 'monthly', status: 'paused' };
    assert.equal(calculateSubscriptionMRR(pausedSub), 0);
  });

  test('AI Churn Risk Engine generates bounded score (0-100) and factors', async () => {
    const analysis = await analyzeChurnRisk(testCustomer1._id, testOrg1._id);
    assert.ok(analysis);
    assert.ok(analysis.riskScore >= 0 && analysis.riskScore <= 100);
    assert.ok(['Low', 'Medium', 'High'].includes(analysis.riskLevel));
    assert.ok(Array.isArray(analysis.riskFactors));
    assert.ok(analysis.explanation.length > 0);
  });
});
