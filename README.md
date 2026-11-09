# SmartCRM — AI-Powered Customer Relationship & Subscription Management Platform

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%2B-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4-38bdf8)](https://tailwindcss.com/)
[![MongoDB & Mongoose](https://img.shields.io/badge/Database-MongoDB%20%26%20Mongoose-47A248)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-ISC-purple)](#)

**SmartCRM** is a production-oriented, multi-tenant SaaS application built on the MERN stack. Designed specifically for SaaS companies, digital agencies, IT service firms, and subscription businesses, SmartCRM bridges the gap between customer relationship tracking and recurring financial revenue operations.

---

## 🌟 Key Highlights & Business Capabilities

- **Normalized Recurring Revenue (MRR / ARR)**: Accurately normalizes monthly, quarterly, semi-annual, and annual billing frequencies. Paused and cancelled subscriptions are never counted towards active MRR.
- **Audited Financial Ledgers**: Strict distinction between recognized revenue, collected payments, and outstanding balances.
- **AI-Powered Customer Intelligence**:
  - **Churn Risk Radar**: Transparent 0–100 heuristic scoring based on overdue payments, interaction recency, and renewal proximity, enriched with actionable retention recommendations.
  - **Smart Upsell & Cross-Sell Engine**: Identifies qualified customers ready for higher plan tiers and calculates exact revenue expansion potential.
  - **360 Customer Summaries**: Executive snapshots synthesized across lifetime spend, interaction velocity, and payment history.
  - **Editable AI Outreach Messages**: One-click professional drafts for renewal notices, overdue reminders, and retention check-ins.
  - **Interactive Natural Language Business Assistant**: Query live workspace statistics (e.g. *"What is our current MRR?"*, *"Which customers have overdue payments?"*) backed directly by authorized MongoDB queries.
- **Enterprise Multi-Tenancy & RBAC**: Complete tenant isolation via `organizationId` scoping, enforcing access controls across 4 distinct user roles: Super Admin, Organization Owner, Manager, and Employee.
- **Automated Background Jobs**: Built-in scheduled cron tasks for renewal alerts, overdue invoice notices, and task reminders with duplicate prevention.
- **Zero-Config Instant Execution**: Automatically boots an embedded in-memory MongoDB instance with pre-seeded demo data if local MongoDB is unavailable.

---

## 🏗️ Technology Stack

### Frontend
- **Framework**: React.js with Vite
- **Styling**: Tailwind CSS with custom SaaS dark/light tokens
- **Icons**: Lucide React
- **Charts & Visualizations**: Recharts (Area charts, Bar charts, Donut/Pie charts)
- **Routing**: React Router DOM (v6) with protected session gates
- **State & Server Cache**: TanStack React Query & React Context API
- **HTTP Client**: Axios with JWT interceptors & auto-refresh handling
- **Notifications**: Sonner toasts

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js (MVC Architecture)
- **Database & ODM**: MongoDB & Mongoose
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Security**: Helmet, CORS, and Express Rate Limiter
- **PDF Engine**: Server-side PDF generation for invoices
- **Automation**: Node-Cron scheduled background jobs
- **AI Provider**: Google Gemini API / OpenAI API with robust deterministic fallback engine

---

## 🔑 Demo Login Credentials

The database comes pre-seeded with a comprehensive demo organization (**Acme SaaS Innovations**), containing 22 customers, 12 sales pipeline leads, 3 subscription tiers, invoices, and payments.

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@smartcrm.io` | `Password123!` | Platform-level management & cross-org visibility |
| **Org Owner** | `owner@acmesaas.io` | `Password123!` | Full organization, billing, and team administration |
| **Sales Manager** | `manager@acmesaas.io` | `Password123!` | Pipeline management, customer analytics & renewals |
| **Success Rep (Employee)** | `employee@acmesaas.io` | `Password123!` | Assigned customer records, interactions & tasks |

*Tip: Quick 1-click login buttons for all 4 roles are available directly on the `/login` screen.*

---

## 📁 Project Directory Structure

```text
SmartCRM-AI/
├── client/                      # React + Vite Frontend
│   ├── public/                  # Public assets & favicons
│   ├── src/
│   │   ├── assets/              # Static styling assets
│   │   ├── components/
│   │   │   ├── layout/          # Navbar, Sidebar, MainLayout
│   │   │   └── ui/              # Button, Card, Modal, Input, Badge, AIAssistantDrawer
│   │   ├── context/             # AuthContext, ThemeContext
│   │   ├── pages/
│   │   │   ├── auth/            # Login, Register, ForgotPassword
│   │   │   ├── dashboard/       # Overview KPI Cards & Recharts
│   │   │   ├── customers/       # Customer Directory & 360 Profile
│   │   │   ├── leads/           # Kanban Sales Pipeline
│   │   │   ├── subscriptions/   # Active Subscriptions Table
│   │   │   ├── plans/           # Subscription Plans & Pricing
│   │   │   ├── payments/        # Transaction History & Recording
│   │   │   ├── invoices/        # Invoices & PDF Generator
│   │   │   ├── tasks/           # Follow-ups & Reminders
│   │   │   ├── ai/              # AI Churn Radar & Business Assistant
│   │   │   ├── analytics/       # Reports & Export Center
│   │   │   └── settings/        # Workspace Profile & Team RBAC
│   │   ├── routes/              # Protected & Public Route Table
│   │   ├── services/            # Axios API Client
│   │   ├── App.jsx              # Application Providers Wrapper
│   │   ├── main.jsx             # React DOM Mounting
│   │   └── index.css            # Tailwind Directives & CSS Variables
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # Node.js + Express Backend
│   ├── config/                  # Database connector & In-Memory fallback
│   ├── controllers/             # Express Request/Response Controllers
│   ├── jobs/                    # Node-Cron Scheduled Tasks
│   ├── middleware/              # Auth, Tenant Scope, Role RBAC, Rate Limiter
│   ├── models/                  # 13 Mongoose Database Schemas
│   ├── routes/                  # Modular RESTful API Endpoints
│   ├── scripts/                 # Realistic Database Seed Script
│   ├── services/                # Decoupled Business Logic
│   │   ├── ai/                  # Churn Engine, Upsell, Summaries, Assistant
│   │   ├── analytics/           # Aggregated KPI & Revenue Computations
│   │   ├── audit/               # Enterprise Audit Logging
│   │   ├── invoice/             # Numbering, Line Calculations, PDFKit Stream
│   │   ├── payment/             # Transaction Tracking & Settlement
│   │   └── subscription/        # MRR / ARR Normalization & Lifecycle
│   ├── tests/                   # Backend Integration Tests
│   ├── app.js                   # Express App Configuration
│   ├── server.js                # HTTP Server Bootstrap
│   └── package.json
│
├── package.json                 # Monorepo Workspace Orchestration
└── README.md                    # Comprehensive Documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- *(Optional)* Local MongoDB or MongoDB Atlas URI (if omitted, the server automatically starts an in-memory database)

### 1. Installation

Clone or enter the project repository and install all dependencies:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Environment Configuration

The repository includes pre-configured `.env` and `.env.example` templates:

**Backend (`server/.env`):**
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/smartcrm
JWT_SECRET=smartcrm_dev_secret_jwt_key_2026_x89a1!
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=smartcrm_dev_refresh_secret_key_2026_z73b2!
JWT_REFRESH_EXPIRES_IN=30d
AI_PROVIDER=gemini
GEMINI_API_KEY=
OPENAI_API_KEY=
```

**Frontend (`client/.env`):**
```env
VITE_API_URL=http://localhost:5001/api/v1
```

*(Note: If you provide a `GEMINI_API_KEY` or `OPENAI_API_KEY`, the AI assistant and churn explanations will use generative AI; if left empty, the built-in deterministic heuristic rule engine runs automatically with zero downtime!)*

### 3. Run the Database Seed (Optional)

```bash
npm run seed
```
*(The server also automatically auto-seeds demonstration records on its first boot if the database is empty).*

### 4. Start the Application

You can start the backend and frontend in separate terminals:

**Terminal 1 — Backend API:**
```bash
npm run dev:server
# Server will run on: http://localhost:5001
```

**Terminal 2 — Frontend Application:**
```bash
npm run dev:client
# Client will run on: http://localhost:5173
```

Navigate to `http://localhost:5173` in your browser. Click on **Org Owner** or **Sales Manager** to log in instantly.

---

## 🧪 Running Backend Tests

The backend includes test suites covering tenant isolation, role-based access, MRR/ARR normalization, and AI churn scoring bounds:

```bash
npm run test:server
```

---

## 📡 REST API Reference (`/api/v1`)

### Authentication
- `POST /auth/register` — Register new owner account and provision workspace
- `POST /auth/login` — Sign in and receive JWT token
- `POST /auth/logout` — End session
- `GET /auth/me` — Current authenticated user profile
- `POST /auth/refresh-token` — Refresh expired JWT

### Customers
- `GET /customers` — List customers (supports `search`, `lifecycleStatus`, `assignedTo`, `sortBy`, `page`, `limit`, `exportFormat=csv`)
- `POST /customers` — Create customer
- `GET /customers/:id` — 360 customer profile (overview, subscriptions, timeline, financial history, AI insights)
- `PATCH /customers/:id` — Update customer
- `DELETE /customers/:id` — Soft-delete customer
- `POST /customers/bulk` — Perform bulk actions (delete, status update, reassign)
- `POST /customers/import` — Batch import customers via JSON

### Subscriptions & Plans
- `GET /plans` — List subscription plans with subscriber counts
- `POST /plans` — Create plan (Owner/Admin)
- `PATCH /plans/:id` — Update plan
- `DELETE /plans/:id` — Delete inactive plan
- `GET /subscriptions` — List customer subscriptions with normalized MRR & ARR
- `POST /subscriptions` — Assign subscription to customer
- `POST /subscriptions/:id/pause` — Pause active subscription
- `POST /subscriptions/:id/resume` — Resume paused subscription
- `POST /subscriptions/:id/cancel` — Cancel subscription
- `POST /subscriptions/:id/upgrade` — Upgrade or change billing cadence

### Leads (Sales Pipeline)
- `GET /leads` — List leads and pipeline stage aggregations
- `POST /leads` — Create lead
- `PATCH /leads/:id/stage` — Move lead stage
- `POST /leads/:id/convert` — Convert lead into customer with audit logging

### Payments & Invoices
- `GET /payments` — List payments (with CSV export)
- `POST /payments` — Record manual payment
- `GET /payments/overdue` — List overdue invoices
- `GET /invoices` — List invoices
- `POST /invoices` — Create itemized invoice
- `GET /invoices/:id/pdf` — Stream downloadable invoice PDF
- `POST /invoices/:id/record-payment` — Apply payment against invoice balance

### AI Intelligence Suite
- `POST /insights/analyze/:customerId` — Recalculate customer churn score (0–100)
- `GET /insights/high-risk` — Fetch workspace-wide high-risk accounts
- `GET /insights/recommendations` — Fetch upsell recommendations
- `POST /insights/customer-summary/:customerId` — Synthesize 360 AI summary
- `POST /insights/generate-message/:customerId` — Draft personalized outreach emails
- `POST /insights/assistant` — Natural language AI queries against live DB metrics

### Analytics
- `GET /analytics/dashboard` — Live dashboard metrics (MRR, ARR, growth %, trend charts)
- `GET /analytics/reports` — Date-range filterable financial & customer acquisition reports

---

## 🚢 Deployment Guidelines

### Frontend (e.g. Vercel)
1. Set the root directory to `client`.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Environment variable: Set `VITE_API_URL` to your production backend API URL (e.g., `https://api.yourdomain.com/api/v1`).

### Backend (e.g. Render / Railway / AWS)
1. Set the root directory to `server`.
2. Build command: `npm install`.
3. Start command: `node server.js`.
4. Environment variables: Provide `NODE_ENV=production`, `PORT`, `MONGODB_URI` (MongoDB Atlas connection string), `CLIENT_URL`, `JWT_SECRET`, and optional `GEMINI_API_KEY` or `OPENAI_API_KEY`.
