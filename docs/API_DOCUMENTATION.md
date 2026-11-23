# SmartCRM AI — Comprehensive REST API Documentation

**Base URL:** `http://localhost:5001/api/v1`  
**Authentication:** `Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication & Tenant Endpoints
- `POST /auth/register` — Register new organization and initial owner account
- `POST /auth/login` — Authenticate user and receive JWT session token
- `GET /auth/me` — Retrieve currently authenticated user context and organization details
- `PUT /auth/profile` — Update user profile details
- `PUT /auth/password` — Change password

---

## 2. Customer Relationship Management (CRM)
- `GET /customers` — List customers with pagination, status filter, and keyword search
- `POST /customers` — Create a new customer profile
- `GET /customers/:id` — Retrieve full 360-degree customer context (subscriptions, deals, tickets, documents, invoices, timeline)
- `PATCH /customers/:id` — Update customer details
- `DELETE /customers/:id` — Soft-delete customer account
- `GET /customers/export/csv` — Stream CSV download of all customer accounts
- `GET /customers/duplicates` — Detect potential duplicate customer records by email or name
- `GET /customers/segments` — Aggregate customer segmentation counts by lifecycle stage

---

## 3. Companies & B2B Accounts
- `GET /companies` — List corporate accounts with size, industry, and search filters
- `POST /companies` — Create a new company record
- `GET /companies/metrics` — Aggregate company account statistics (total accounts, enterprise, revenue)
- `GET /companies/:id` — Get company details along with associated contacts and deals
- `PUT /companies/:id` — Update company profile
- `DELETE /companies/:id` — Archive company record

---

## 4. Contacts Directory
- `GET /contacts` — List contacts filtered by company or customer
- `POST /contacts` — Create a new point-of-contact
- `GET /contacts/:id` — Retrieve contact details
- `PUT /contacts/:id` — Update contact information
- `DELETE /contacts/:id` — Archive contact record

---

## 5. Sales Pipeline & Deals
- `GET /deals` — List sales opportunities with stage and owner filters
- `GET /deals/pipeline` — Get Kanban column data grouped by stages with totals and probabilities
- `GET /deals/forecast` — Aggregate pipeline value, probability-weighted forecast, and win rate
- `POST /deals` — Create a new deal opportunity
- `GET /deals/:id` — Get deal details with stage history
- `PUT /deals/:id` — Update deal parameters
- `PATCH /deals/:id/stage` — Move deal across stages (records transition in stageHistory)
- `DELETE /deals/:id` — Archive deal

---

## 6. Calendar & Scheduled Events
- `GET /calendar` — Get scheduled events within a date range (`start`, `end`)
- `POST /calendar` — Schedule a new event, meeting, demo, or renewal check-in
- `PUT /calendar/:id` — Update calendar event
- `DELETE /calendar/:id` — Cancel / delete calendar event

---

## 7. Customer Support Tickets
- `GET /tickets` — List support tickets with status, priority, and category filters
- `GET /tickets/metrics` — Aggregate ticket volume, urgent SLA counts, and resolution rates
- `POST /tickets` — Create a new ticket with automatic ticket number generation (`TCK-xxxx`)
- `GET /tickets/:id` — Retrieve ticket discussion thread
- `PUT /tickets/:id` — Update ticket status or priority
- `POST /tickets/:id/messages` — Append reply message to conversation thread

---

## 8. Document Vault & Storage
- `GET /documents` — List uploaded files and contracts
- `GET /documents/metrics` — Total documents and storage consumed (bytes)
- `POST /documents/upload` — Upload multipart file (25MB limit) with category and title
- `GET /documents/:id/download` — Stream secure file download
- `DELETE /documents/:id` — Soft-delete document

---

## 9. Workflow Automation Center
- `GET /automations` — List automation rules
- `POST /automations` — Create trigger-condition-action automation rule
- `PUT /automations/:id` — Update automation rule
- `PATCH /automations/:id/toggle` — Activate / deactivate rule
- `POST /automations/:id/trigger` — Manually execute automation rule
- `DELETE /automations/:id` — Delete automation rule
- `GET /automations/executions` — List historical automation execution logs

---

## 10. Subscriptions & Billing
- `GET /subscriptions` — List subscriptions with enriched MRR and ARR values
- `POST /subscriptions` — Create new customer subscription
- `GET /subscriptions/:id` — Retrieve subscription with plan details
- `POST /subscriptions/:id/pause` — Pause active subscription
- `POST /subscriptions/:id/resume` — Resume paused subscription
- `POST /subscriptions/:id/cancel` — Cancel subscription with cancellation reason
- `POST /subscriptions/:id/upgrade` — Upgrade or downgrade subscription plan
- `POST /subscriptions/:id/renew` — Advance subscription period and renew active status

---

## 11. Payments & Invoices
- `GET /invoices` — List customer invoices
- `POST /invoices` — Generate new invoice
- `GET /invoices/:id/pdf` — Stream generated PDF invoice compiled via PDFKit
- `POST /payments` — Record payment transaction against invoice

---

## 12. AI Intelligence & Copilot
- `POST /insights/assistant` — Query AI CRM Copilot for natural language answers
- `GET /insights/high-risk` — List accounts flagged with high churn probability
- `POST /insights/analyze/:customerId` — Recalculate deterministic churn score for customer
- `GET /insights/recommendations` — Detect plan upgrade and cross-sell expansion opportunities
- `POST /insights/customer-summary/:customerId` — Generate executive 360 summary
- `POST /insights/generate-message/:customerId` — Draft personalized outreach email
