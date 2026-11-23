# SmartCRM AI — System Architecture & Design Documentation

## 1. Architectural Overview

SmartCRM AI is built as a production-grade, multi-tenant Software-as-a-Service (SaaS) application on the modern MERN stack with native AI Copilot intelligence:

```
┌─────────────────────────────────────────────────────────────┐
│                 React 18 + Vite Frontend                     │
│  - Tailwind CSS + Shadcn UI Design Primitives               │
│  - TanStack React Query + Axios Interceptor                 │
│  - Recharts Visual Analytics + Sonner Toasts                │
│  - 22 Main SaaS Views (Kanban, Calendar, CRM, Vault)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST API
┌──────────────────────────────▼──────────────────────────────┐
│                  Express.js REST API Server                 │
│  - JWT Bearer Authentication Middleware                     │
│  - Strict Multi-Tenant Isolation Middleware (organizationId)│
│  - Granular RBAC Middleware (10 Enterprise Roles)           │
│  - Multer File Streaming & Disk Storage Engine              │
│  - PDFKit Dynamic Invoice Compilation                       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     Persistent MongoDB      ││       AI Intelligence Engine │
│  - 17 Mongoose Collections  ││  - Gemini & OpenAI SDKs      │
│  - Compound Tenant Indices  ││  - Rule-Based Fallback Engine│
│  - Soft-Deletion Pattern    ││  - Churn Risk Heuristics     │
│  - Automated Audit Trail    ││  - Dynamic Upsell Detection  │
└─────────────────────────────┘└──────────────────────────────┘
```

---

## 2. Multi-Tenancy & Security Isolation

Multi-tenancy is enforced at both middleware and database layers:

1. **Context Resolution:** Upon JWT validation, `req.organizationId` is extracted from the user record.
2. **Strict Query Boundary:** Every MongoDB read, write, update, and delete query is bounded by `{ organizationId: req.organizationId, isDeleted: false }`.
3. **Role-Based Access Control (RBAC):**
   - `super_admin`: Global platform administrator
   - `owner` / `org_admin`: Full tenant administrative privileges
   - `sales_manager`: Pipeline oversight, team assignments, deal forecasts
   - `sales_rep`: Lead prospecting, deal progression, contact management
   - `finance_manager`: Subscription billing, invoice reconciliation, MRR/ARR analytics
   - `support_agent`: Ticket triage, resolution notes, customer touchpoints
   - `viewer` / `employee`: Read-only reporting access

---

## 3. Subscription & Financial Engine

Normalized SaaS recurring revenue metrics are computed with zero rounding drift:
- **Monthly Recurring Revenue (MRR):**
  - Monthly: `amount`
  - Quarterly: `amount / 3`
  - Semi-Annual: `amount / 6`
  - Annual: `amount / 12`
  - Non-active states (`cancelled`, `paused`, `expired`): `0`
- **Annual Recurring Revenue (ARR):** `MRR * 12`
- **Lifecycle Operations:** State machine tracking transitions between `trial`, `active`, `past_due`, `paused`, `cancelled`, `expired`, and `pending` with full historical audit trails.

---

## 4. AI Copilot & Heuristic Fallback Engine

The AI subsystem operates with dual architecture:
1. **Primary LLM Integration:** Google Gemini (`@google/genai`) and OpenAI (`openai`) APIs for creative copy, personalized outreach email drafting, and executive summaries.
2. **Deterministic Fallback Engine:** When external AI APIs are offline or unconfigured, an in-house rule-based engine computes:
   - Churn probability scores (0–100) based on days since last touchpoint, overdue invoices, and ticket severity.
   - Smart expansion and upsell opportunity identification.
   - Conversational CRM Copilot responses querying live MongoDB collections.
