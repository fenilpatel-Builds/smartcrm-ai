# SmartCRM AI — Database Schemas & Mongoose Models

SmartCRM AI utilizes MongoDB with strict Mongoose ODM schemas, compound multi-tenant indexes, and relational references:

---

## 1. Core Tenant & Identity Models

### `Organization`
- `name` (String, required)
- `slug` (String, unique, lowercase)
- `email`, `phone`, `address` (Object: street, city, state, country, zipCode)
- `currency` (String, default: 'USD')
- `timezone` (String, default: 'America/Los_Angeles')
- `settings` (taxRate, taxId, invoicePrefix, renewalNoticeDays)

### `User`
- `name` (String, required)
- `email` (String, unique, lowercase, required)
- `passwordHash` (String, select: false)
- `role` (String, enum: `super_admin`, `owner`, `org_admin`, `manager`, `sales_manager`, `sales_rep`, `finance_manager`, `support_agent`, `viewer`, `employee`)
- `organizationId` (ObjectId, ref: Organization, index: true)
- `avatar`, `isVerified`, `isActive`, `lastLogin`

---

## 2. CRM Entity Models

### `Customer`
- `organizationId` (ObjectId, ref: Organization, required, index: true)
- `name`, `email` (required, lowercase, indexed)
- `phone`, `company`
- `address` (street, city, state, country, zipCode)
- `source` (website, referral, cold_outreach, inbound, advertising, partner, other)
- `lifecycleStatus` (lead, prospect, customer, churned, inactive)
- `assignedTo` (ObjectId, ref: User)
- `tags` ([String]), `notes` (String), `isDeleted` (Boolean, default: false)

### `Company`
- `organizationId` (ObjectId, ref: Organization, required, index: true)
- `name` (String, required, indexed)
- `domain`, `industry`, `size` ('1-10', '11-50', '51-200', '201-500', '500+')
- `phone`, `website`, `address`, `annualRevenue`, `assignedTo`, `notes`, `isDeleted`

### `Contact`
- `organizationId` (ObjectId, ref: Organization, required, index: true)
- `firstName`, `lastName`, `email` (required)
- `phone`, `jobTitle`, `department`
- `companyId` (ObjectId, ref: Company)
- `customerId` (ObjectId, ref: Customer)
- `isPrimary` (Boolean, default: false)
- `assignedTo` (ObjectId, ref: User), `socialProfiles` (linkedin, twitter)

### `Deal`
- `organizationId` (ObjectId, ref: Organization, required, index: true)
- `title` (String, required)
- `value` (Number, required, min: 0)
- `currency` (String, default: 'USD')
- `stage` (discovery, qualified, proposal, negotiation, closed_won, closed_lost)
- `probability` (Number: 0-100)
- `expectedCloseDate`, `actualCloseDate`
- `companyId`, `contactId`, `customerId`, `assignedTo`, `priority`, `lostReason`
- `stageHistory` ([{ stage, enteredAt, exitedAt, changedBy }])
- *Virtual:* `weightedValue` (`(value * probability) / 100`)

### `CalendarEvent`
- `organizationId` (ObjectId, ref: Organization, required, index: true)
- `title`, `description`, `eventType` (meeting, call, demo, task_deadline, renewal, follow_up)
- `startDate`, `endDate`, `allDay`, `location`, `meetUrl`
- `createdBy` (ObjectId, ref: User), `status` (scheduled, completed, cancelled)

### `SupportTicket`
- `organizationId` (ObjectId, ref: Organization, required, index: true)
- `ticketNumber` (String, required, unique per org)
- `subject`, `description`, `customerId`, `contactId`
- `priority` (low, medium, high, urgent)
- `status` (open, in_progress, waiting, resolved, closed)
- `assignedTo`, `category`, `resolutionNotes`, `resolvedAt`
- `messages` ([{ sender, senderName, senderType, content, createdAt }])

### `Document`
- `organizationId` (ObjectId, ref: Organization, required, index: true)
- `title`, `fileName`, `originalName`, `filePath`, `fileSize`, `mimeType`
- `category` (Contract, Proposal, Invoice, NDA, Report, Other)
- `relatedEntityType`, `relatedEntityId`, `uploadedBy`, `isDeleted`

### `AutomationRule` & `AutomationExecution`
- `triggerType` (lead_created, deal_won, subscription_cancelled, ticket_created, payment_failed)
- `conditions` ([{ field, operator, value }])
- `actions` ([{ actionType, payload }])
- `isActive` (Boolean), `executionCount` (Number)

---

## 3. Subscription & Billing Models

### `SubscriptionPlan`
- `name`, `description`, `pricing` (monthly, quarterly, semiAnnual, annual), `features`, `trialDays`

### `Subscription`
- `customerId`, `planId`, `billingFrequency`, `amount`, `startDate`, `currentPeriodStart`, `currentPeriodEnd`, `nextRenewalDate`
- `status` (trial, active, past_due, paused, cancelled, expired, pending)
- `history` ([{ action, fromStatus, toStatus, reason, changedAt }])

### `Invoice` & `Payment`
- `invoiceNumber`, `customerId`, `items`, `subtotal`, `tax`, `total`, `balanceDue`, `status`, `dueDate`
- `paymentMethod`, `transactionReference`, `amount`, `status`, `paidAt`
