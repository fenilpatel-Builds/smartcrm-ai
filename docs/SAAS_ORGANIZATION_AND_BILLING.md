# SmartCRM AI — Multi-Tenant SaaS Organization, Billing & Limits

## 1. Multi-Tenant Organization Model

SmartCRM AI implements a strict logical multi-tenant architecture. Every customer, lead, contact, deal, document, invoice, payment, and background job is tied to an `organizationId`.

```
                        +----------------------------+
                        |      Organization Model    |
                        | - slug (unique subdomain)  |
                        | - name, branding, logo     |
                        | - planLimits (capacity)    |
                        | - onboarding (progress)    |
                        | - integrations (keys)      |
                        +----------------------------+
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
         v                            v                            v
+------------------+         +------------------+         +------------------+
|      Users       |         |   CRM Entities   |         |  Billing Engine  |
| - super_admin    |         | - Customers      |         | - Subscriptions  |
| - admin          |         | - Contacts       |         | - Invoices       |
| - manager        |         | - Deals          |         | - Payments       |
| - user           |         | - SupportTickets |         | - Razorpay Order |
+------------------+         +------------------+         +------------------+
```

---

## 2. SaaS Tier Limits & Capacity Enforcement

To support monetization and protect shared infrastructure, SmartCRM AI enforces hard capacity limits across all SaaS plans:

| Metric | Free / Starter | Professional | Enterprise |
| :--- | :--- | :--- | :--- |
| **Max Users** | 3 | 15 | Unlimited (9,999) |
| **Max Customers** | 100 | 2,500 | Unlimited (100,000) |
| **Max Contacts** | 250 | 10,000 | Unlimited (250,000) |
| **Max Active Deals** | 25 | 500 | Unlimited (10,000) |
| **Storage (MB)** | 250 MB | 5,000 MB (5 GB) | 100,000 MB (100 GB) |
| **Max Automation Rules** | 3 | 25 | Unlimited (500) |
| **Monthly Emails** | 500 | 10,000 | 100,000 |

### Middleware Enforcement: `enforcePlanLimit`
The backend middleware (`server/middleware/planLimitMiddleware.js`) actively intercepts creation requests (`POST /customers`, `POST /deals`, `POST /contacts`, etc.). If current tenant count meets or exceeds the plan limit:
1. Blocks the request with HTTP 403 Forbidden.
2. Returns standardized payload:
   ```json
   {
     "success": false,
     "error": "PLAN_LIMIT_EXCEEDED",
     "message": "Plan limit reached for customers: 100/100 used. Please upgrade your plan.",
     "current": 100,
     "limit": 100
   }
   ```
3. Super Admins bypass limits to ensure administrative maintenance.

---

## 3. Onboarding Wizard Progress Tracking

When an organization registers, `Organization.onboarding` tracks onboarding state:
- `isCompleted`: Boolean flag indicating completed onboarding.
- `currentStep`: `1: profile` -> `2: team` -> `3: integrations` -> `4: complete`.
- `completedSteps`: Array tracking completed milestones:
  - `profile_completed`
  - `first_customer_added`
  - `gateway_configured`
  - `team_invited`

The UI surfaces an interactive onboarding progress checklist that smoothly walks the admin through initial CRM setup.

---

## 4. Visual SaaS Plan & Metered Usage Dashboard

The Settings view (`Settings.jsx` -> Tab `SaaS Plan & Usage Limits`) provides real-time progress bars and capacity gauges:
- Real-time percentage used for each metric.
- Dynamic color indicators: Green (<70%), Amber (70-90%), Red (>90%).
- Upgrade CTAs that link to Plan Selection and Payment Gateway checkout.
