import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB, closeDB } from '../config/db.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Lead } from '../models/Lead.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Subscription } from '../models/Subscription.js';
import { Payment } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';
import { InteractionLog } from '../models/InteractionLog.js';
import { Task } from '../models/Task.js';
import { AIInsight } from '../models/AIInsight.js';
import { Notification } from '../models/Notification.js';

dotenv.config();

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await connectDB();

    console.log('[Seed] Purging existing database collections for fresh seed...');
    await Promise.all([
      Organization.deleteMany({}),
      User.deleteMany({}),
      Customer.deleteMany({}),
      Lead.deleteMany({}),
      SubscriptionPlan.deleteMany({}),
      Subscription.deleteMany({}),
      Payment.deleteMany({}),
      Invoice.deleteMany({}),
      InteractionLog.deleteMany({}),
      Task.deleteMany({}),
      AIInsight.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    console.log('[Seed] Creating Demo Organization...');
    const organization = await Organization.create({
      name: 'Acme SaaS Innovations',
      slug: 'acme-saas',
      email: 'contact@acmesaas.io',
      phone: '+1 (555) 234-5678',
      address: {
        street: '100 Tech Horizon Blvd, Suite 400',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        zipCode: '94105',
      },
      currency: 'USD',
      timezone: 'America/Los_Angeles',
      settings: {
        taxRate: 8.5,
        taxId: 'US-94105-TAX',
        invoicePrefix: 'ACME',
        renewalNoticeDays: 7,
        overdueNoticeDays: 3,
        enableAutoRenewals: true,
      },
    });

    console.log('[Seed] Creating Users across all 4 roles...');
    const defaultPassword = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    const superAdmin = await User.create({
      name: 'Sophia Vance (Super Admin)',
      email: 'admin@smartcrm.io',
      passwordHash,
      role: 'super_admin',
      organizationId: organization._id,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    });

    const owner = await User.create({
      name: 'David Miller (Org Owner)',
      email: 'owner@acmesaas.io',
      passwordHash,
      role: 'owner',
      organizationId: organization._id,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    });

    const manager = await User.create({
      name: 'Elena Rostova (Sales Manager)',
      email: 'manager@acmesaas.io',
      passwordHash,
      role: 'manager',
      organizationId: organization._id,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    });

    const employee = await User.create({
      name: 'Marcus Chen (Success Rep)',
      email: 'employee@acmesaas.io',
      passwordHash,
      role: 'employee',
      organizationId: organization._id,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    });

    console.log('[Seed] Creating Subscription Plans...');
    const plans = await SubscriptionPlan.create([
      {
        organizationId: organization._id,
        name: 'Starter Cloud',
        description: 'Ideal for early-stage teams wanting automated CRM and contacts pipeline.',
        pricing: {
          monthly: 49,
          quarterly: 135,
          semiAnnual: 260,
          annual: 490,
        },
        features: ['Up to 1,000 Contacts', 'Basic Sales Pipeline', 'Email Support', '1 Team Seat'],
        trialDays: 14,
        isActive: true,
      },
      {
        organizationId: organization._id,
        name: 'Professional Growth',
        description: 'Complete operational CRM with subscription tracking and AI retention alerts.',
        pricing: {
          monthly: 149,
          quarterly: 420,
          semiAnnual: 810,
          annual: 1490,
        },
        features: ['Up to 10,000 Contacts', 'AI Churn Radar', 'Automated Invoicing', '5 Team Seats', 'Priority Support'],
        trialDays: 0,
        isActive: true,
      },
      {
        organizationId: organization._id,
        name: 'Enterprise Scale',
        description: 'Designed for scaling SaaS companies requiring custom workflows, multi-seat governance, and dedicated account success.',
        pricing: {
          monthly: 399,
          quarterly: 1100,
          semiAnnual: 2150,
          annual: 3990,
        },
        features: ['Unlimited Contacts', 'Advanced AI Upsell & Churn', 'Custom Invoicing & Gateways', 'Unlimited Seats', 'Dedicated Success Manager', 'SLA 99.9%'],
        trialDays: 0,
        isActive: true,
      },
    ]);

    const starterPlan = plans[0];
    const proPlan = plans[1];
    const entPlan = plans[2];

    console.log('[Seed] Creating 22 Sample Customers...');
    const customerRawData = [
      { name: 'Alice Cooper', email: 'alice@nexusmedia.com', phone: '+1 415-890-1201', company: 'Nexus Media Inc.', source: 'website', status: 'customer' },
      { name: 'Robert Chen', email: 'robert@vertexhealth.org', phone: '+1 415-890-1202', company: 'Vertex Health Systems', source: 'referral', status: 'customer' },
      { name: 'Samantha Diaz', email: 'sam@cloudscale.tech', phone: '+1 415-890-1203', company: 'CloudScale Technologies', source: 'inbound', status: 'customer' },
      { name: 'Benjamin Lee', email: 'ben@stratafin.com', phone: '+1 415-890-1204', company: 'Strata Financial Group', source: 'advertising', status: 'customer' },
      { name: 'Karen Wright', email: 'karen@omnilogistics.com', phone: '+1 415-890-1205', company: 'Omni Logistics Global', source: 'partner', status: 'customer' },
      { name: 'Michael Scott', email: 'michael@dunderai.net', phone: '+1 415-890-1206', company: 'Dunder AI Labs', source: 'website', status: 'customer' },
      { name: 'Rachel Green', email: 'rachel@bloomretail.com', phone: '+1 415-890-1207', company: 'Bloom Retail Analytics', source: 'cold_outreach', status: 'customer' },
      { name: 'Harvey Specter', email: 'harvey@pearsonpartners.com', phone: '+1 415-890-1208', company: 'Pearson Legal Partners', source: 'referral', status: 'customer' },
      { name: 'Diana Prince', email: 'diana@themysciradesign.io', phone: '+1 415-890-1209', company: 'Themyscira Design Studios', source: 'website', status: 'customer' },
      { name: 'Thomas Wayne', email: 'thomas@waynesolutions.com', phone: '+1 415-890-1210', company: 'Wayne Solutions Enterprise', source: 'inbound', status: 'customer' },
      { name: 'Jessica Pearson', email: 'jessica@specterholdings.com', phone: '+1 415-890-1211', company: 'Specter Holdings LLC', source: 'referral', status: 'customer' },
      { name: 'Lucas Scott', email: 'lucas@treehillmedia.com', phone: '+1 415-890-1212', company: 'Tree Hill Media', source: 'advertising', status: 'customer' },
      { name: 'Clara Oswald', email: 'clara@tardisconsulting.co', phone: '+1 415-890-1213', company: 'Tardis Consulting Co', source: 'website', status: 'customer' },
      { name: 'Oliver Queen', email: 'oliver@starlinggreen.org', phone: '+1 415-890-1214', company: 'Starling Green Energy', source: 'partner', status: 'customer' },
      { name: 'Barry Allen', email: 'barry@centralcitylogistics.com', phone: '+1 415-890-1215', company: 'Central City Logistics', source: 'inbound', status: 'customer' },
      { name: 'Kara Danvers', email: 'kara@catcomedia.com', phone: '+1 415-890-1216', company: 'Catco Media Global', source: 'website', status: 'customer' },
      { name: 'Bruce Banner', email: 'bruce@gammaresearch.edu', phone: '+1 415-890-1217', company: 'Gamma Research Institute', source: 'referral', status: 'customer' },
      { name: 'Natasha Roman', email: 'natasha@redshieldsecurity.com', phone: '+1 415-890-1218', company: 'Red Shield Cybersecurity', source: 'cold_outreach', status: 'customer' },
      { name: 'Tony Stark', email: 'tony@arcindustries.tech', phone: '+1 415-890-1219', company: 'Arc Industries AI', source: 'inbound', status: 'customer' },
      { name: 'Peter Parker', email: 'peter@webslingmedia.com', phone: '+1 415-890-1220', company: 'WebSling Photo Agency', source: 'website', status: 'inactive' },
      { name: 'Arthur Curry', email: 'arthur@atlanticoceanic.org', phone: '+1 415-890-1221', company: 'Atlantic Marine Logistics', source: 'referral', status: 'churned' },
      { name: 'Victor Stone', email: 'victor@cybergencollective.io', phone: '+1 415-890-1222', company: 'CyberGen Collective', source: 'website', status: 'churned' },
    ];

    const customers = [];
    const teamUserIds = [owner._id, manager._id, employee._id];

    for (let i = 0; i < customerRawData.length; i++) {
      const c = customerRawData[i];
      const assignedUser = teamUserIds[i % teamUserIds.length];
      const createdDaysAgo = 30 + (i * 5);
      const createdAt = new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000);

      const customer = await Customer.create({
        organizationId: organization._id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        address: {
          street: `${100 + i} Market Street`,
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          zipCode: '94105',
        },
        source: c.source,
        lifecycleStatus: c.status,
        assignedTo: assignedUser,
        tags: ['enterprise', 'high-value'],
        notes: `Customer account managed by team. Joined via ${c.source}.`,
        createdAt,
      });

      customers.push(customer);
    }

    console.log('[Seed] Assigning Subscriptions, Payments & Invoices to Customers...');
    const now = new Date();

    for (let i = 0; i < customers.length; i++) {
      const cust = customers[i];
      if (cust.lifecycleStatus === 'churned') {
        // Cancelled subscription
        const sub = await Subscription.create({
          organizationId: organization._id,
          customerId: cust._id,
          planId: starterPlan._id,
          billingFrequency: 'monthly',
          amount: starterPlan.pricing.monthly,
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          currentPeriodStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          nextRenewalDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          status: 'cancelled',
          cancelledAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          cancelReason: 'Customer shifted focus to internal proprietary tool.',
        });

        // AI Insight: Churned
        await AIInsight.create({
          organizationId: organization._id,
          customerId: cust._id,
          insightType: 'churn_analysis',
          riskLevel: 'High',
          riskScore: 95,
          riskFactors: ['Subscription cancelled', 'No interactions in over 60 days'],
          recommendations: ['Schedule a win-back exit interview', 'Send discounted win-back campaign in 60 days'],
          explanation: 'Account has cancelled subscription. Immediate re-engagement campaign recommended.',
          generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        });
        continue;
      }

      // Active Customers
      let assignedPlan = starterPlan;
      let frequency = 'monthly';
      if (i % 3 === 0) {
        assignedPlan = entPlan;
        frequency = 'annual';
      } else if (i % 2 === 0) {
        assignedPlan = proPlan;
        frequency = 'monthly';
      }

      const amount = frequency === 'annual' ? assignedPlan.pricing.annual : assignedPlan.pricing.monthly;
      const renewalDays = (i % 25) + 3; // spread out renewal dates over next 28 days
      const renewalDate = new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000);

      const sub = await Subscription.create({
        organizationId: organization._id,
        customerId: cust._id,
        planId: assignedPlan._id,
        billingFrequency: frequency,
        amount,
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: renewalDate,
        nextRenewalDate: renewalDate,
        status: i === 4 ? 'past_due' : 'active',
        paymentStatus: i === 4 ? 'failed' : 'paid',
      });

      // Invoices & Payments
      const invoiceNum = `ACME-2026-${String(i + 1).padStart(4, '0')}`;
      const isOverdue = i === 4 || i === 7;

      const invoice = await Invoice.create({
        organizationId: organization._id,
        invoiceNumber: invoiceNum,
        customerId: cust._id,
        subscriptionId: sub._id,
        items: [
          {
            description: `${assignedPlan.name} Subscription (${frequency})`,
            quantity: 1,
            unitPrice: amount,
            total: amount,
          },
        ],
        subtotal: amount,
        tax: Math.round(amount * 0.085 * 100) / 100,
        total: Math.round(amount * 1.085 * 100) / 100,
        amountPaid: isOverdue ? 0 : Math.round(amount * 1.085 * 100) / 100,
        balanceDue: isOverdue ? Math.round(amount * 1.085 * 100) / 100 : 0,
        issueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        dueDate: isOverdue ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: isOverdue ? 'overdue' : 'paid',
      });

      if (!isOverdue) {
        await Payment.create({
          organizationId: organization._id,
          customerId: cust._id,
          subscriptionId: sub._id,
          invoiceId: invoice._id,
          amount: invoice.total,
          currency: 'USD',
          paymentMethod: 'credit_card',
          transactionReference: `TXN-ACME-${Date.now()}-${i}`,
          status: 'paid',
          paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        });
      }

      // Add historical payments for revenue trend chart (months prior)
      for (let m = 1; m <= 5; m++) {
        const pastDate = new Date();
        pastDate.setMonth(pastDate.getMonth() - m);
        pastDate.setDate(15);

        await Payment.create({
          organizationId: organization._id,
          customerId: cust._id,
          subscriptionId: sub._id,
          amount: Math.round(amount * (0.8 + Math.random() * 0.4)),
          currency: 'USD',
          paymentMethod: 'credit_card',
          transactionReference: `TXN-HIST-${m}-${i}`,
          status: 'paid',
          paidAt: pastDate,
        });
      }

      // Interactions
      await InteractionLog.create({
        organizationId: organization._id,
        customerId: cust._id,
        userId: cust.assignedTo,
        interactionType: i % 2 === 0 ? 'call' : 'email',
        subject: i % 2 === 0 ? 'Quarterly Strategy Review' : 'Feature Update Follow-up',
        description: `Discussed customer satisfaction, workflow throughput, and future expansion priorities.`,
        interactionDate: new Date(Date.now() - (i * 2 + 1) * 24 * 60 * 60 * 1000),
      });

      // Tasks
      if (i < 8) {
        await Task.create({
          organizationId: organization._id,
          customerId: cust._id,
          assignedTo: cust.assignedTo,
          createdBy: owner._id,
          title: isOverdue ? `Follow up on overdue invoice #${invoice.invoiceNumber}` : `Prepare quarterly renewal deck`,
          description: isOverdue ? 'Reach out to accounting contact to resolve payment failure.' : 'Send personalized feature utilization review.',
          priority: isOverdue ? 'urgent' : i % 2 === 0 ? 'high' : 'medium',
          dueDate: new Date(Date.now() + (i * 2 - 2) * 24 * 60 * 60 * 1000),
          status: 'pending',
        });
      }

      // AI Insights: Churn & Upsell
      const riskScore = isOverdue ? 82 : i === 3 ? 68 : 18;
      const riskLevel = riskScore >= 66 ? 'High' : riskScore >= 36 ? 'Medium' : 'Low';

      await AIInsight.create({
        organizationId: organization._id,
        customerId: cust._id,
        insightType: 'churn_analysis',
        riskLevel,
        riskScore,
        riskFactors: isOverdue
          ? ['Unresolved overdue invoice', 'Subscription payment failure recorded']
          : riskScore > 50
          ? ['No recent interactions in 25 days', 'Renewal scheduled in under 10 days']
          : ['Healthy payment history', 'Regular touchpoints'],
        recommendations: isOverdue
          ? ['Send immediate payment link', 'Schedule accounting alignment call']
          : ['Conduct customer satisfaction check', 'Propose upgrade demonstration'],
        explanation: `Customer is flagged as ${riskLevel} risk based on current payment status and communication cadence.`,
        generatedAt: new Date(),
      });
    }

    console.log('[Seed] Creating 12 Sales Pipeline Leads...');
    const leadRawData = [
      { name: 'Arthur Dent', email: 'arthur@hitchhiker.io', phone: '+1 555-0101', company: 'Galaxy Travel Labs', stage: 'new_lead', value: 2500 },
      { name: 'Ford Prefect', email: 'ford@betelgeuse.com', phone: '+1 555-0102', company: 'Prefect Publishing', stage: 'contacted', value: 4800 },
      { name: 'Trillian Astra', email: 'trillian@subether.org', phone: '+1 555-0103', company: 'SubEther Network', stage: 'qualified', value: 9200 },
      { name: 'Zaphod Beeble', email: 'zaphod@heartofgold.net', phone: '+1 555-0104', company: 'Heart of Gold Ventures', stage: 'proposal_sent', value: 18000 },
      { name: 'Marvin Android', email: 'marvin@siriuscyber.com', phone: '+1 555-0105', company: 'Sirius Cybernetics Corp', stage: 'negotiation', value: 24000 },
      { name: 'Slartibartfast', email: 'slarti@coastlines.design', phone: '+1 555-0106', company: 'Fjord Design Group', stage: 'qualified', value: 6500 },
      { name: 'Deep Thought', email: 'deep@fortytwo.ai', phone: '+1 555-0107', company: 'FortyTwo Compute', stage: 'contacted', value: 12000 },
      { name: 'Eddie Computer', email: 'eddie@shipboard.io', phone: '+1 555-0108', company: 'Shipboard Systems', stage: 'new_lead', value: 3500 },
      { name: 'Gag Halfrunt', email: 'gag@braincare.clinic', phone: '+1 555-0109', company: 'BrainCare Clinics', stage: 'proposal_sent', value: 14500 },
      { name: 'Humma Kavula', email: 'humma@jovianmission.org', phone: '+1 555-0110', company: 'Jovian Mission Group', stage: 'negotiation', value: 32000 },
      { name: 'Fenil Patel', email: 'fenil@cloudcraft.dev', phone: '+1 555-0111', company: 'CloudCraft AI Solutions', stage: 'qualified', value: 15000 },
      { name: 'Elena Gilbert', email: 'elena@mysticlogistics.com', phone: '+1 555-0112', company: 'Mystic Logistics', stage: 'lost', value: 5000 },
    ];

    for (const l of leadRawData) {
      await Lead.create({
        organizationId: organization._id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        company: l.company,
        source: 'inbound',
        stage: l.stage,
        assignedTo: manager._id,
        estimatedValue: l.value,
        notes: `High-intent inbound inquiry from enterprise landing page. Target plan: Professional Growth.`,
        stageHistory: [
          {
            stage: 'new_lead',
            changedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            changedBy: manager._id,
          },
          ...(l.stage !== 'new_lead'
            ? [
                {
                  stage: l.stage,
                  changedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                  changedBy: manager._id,
                },
              ]
            : []),
        ],
      });
    }

    console.log('[Seed] Creating System Notifications...');
    await Notification.create([
      {
        organizationId: organization._id,
        title: 'High-Risk Customer Flagged',
        message: 'Karen Wright (Omni Logistics) has an overdue balance of $1,616.65 and was marked High Risk.',
        type: 'churn_alert',
      },
      {
        organizationId: organization._id,
        title: 'Upcoming Subscription Renewal',
        message: 'Nexus Media Inc. subscription renews in 4 days ($1,490.00).',
        type: 'renewal',
      },
      {
        organizationId: organization._id,
        title: 'New Lead Qualified',
        message: 'Fenil Patel from CloudCraft AI Solutions moved to Qualified stage ($15,000 est. value).',
        type: 'lead_activity',
      },
    ]);

    console.log('===============================================================');
    console.log('✅ SEED COMPLETED SUCCESSFULLY!');
    console.log('===============================================================');
    console.log('🏢 Demo Organization: Acme SaaS Innovations (acme-saas)');
    console.log('');
    console.log('🔑 DEMO LOGIN CREDENTIALS (Password for all: Password123!):');
    console.log('  1. Super Admin: admin@smartcrm.io');
    console.log('  2. Org Owner:   owner@acmesaas.io');
    console.log('  3. Manager:     manager@acmesaas.io');
    console.log('  4. Employee:    employee@acmesaas.io');
    console.log('===============================================================');
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    throw error;
  }
};

// If run directly via CLI
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      console.log('[Seed] Script finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Script terminated with error:', err);
      process.exit(1);
    });
}
