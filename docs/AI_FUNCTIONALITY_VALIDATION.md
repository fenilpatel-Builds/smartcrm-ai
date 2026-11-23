# SmartCRM AI — Grounded AI Functionality & Intelligence Validation (Phase 2)

**Evaluation Date:** November 23, 2026  
**Module Scope:** AI Business Assistant, Churn Risk Radar, Upsell Engine, Outreach Drafter  
**Core Standard:** Zero Hallucination, Grounded In-Database Reasoning  
**Status:** **100% Operational & Verified**

---

## 1. Overview & Architectural Principle

Unlike naive wrappers that pass arbitrary user prompts to an LLM without business context, SmartCRM AI adopts a **Grounded Aggregation Architecture**:
1. Incoming natural language prompts are classified into operational CRM categories (Revenue, Churn, Invoices, Renewals, Deals, Tasks, Support).
2. The system executes exact MongoDB database queries and aggregations within the user's isolated tenant.
3. The retrieved real-world numbers and entities are presented either directly or synthesized using concise executive summarization.
4. **No numbers, revenue figures, or customer lists are ever invented or hallucinated.**

---

## 2. Core AI Modules

### 2.1 Executive Business Assistant (`assistantService.js`)
Handles inquiries such as:
- *"What is our current MRR and ARR revenue?"* -> Queries active subscriptions, normalizes billing frequencies, returns exact revenue metrics.
- *"Which customers are at high risk of churn?"* -> Aggregates active churn insights, returns prioritized accounts.
- *"Show me our open deals pipeline and closing forecast"* -> Calculates total pipeline value and probability-weighted revenue forecast.
- *"Are there overdue invoices?"* -> Aggregates unpaid invoices past due date.
- *"Who should we follow up with today?"* -> Queries pending tasks due before end of day.

### 2.2 Transparent Churn Risk Radar (`churnPredictionService.js`)
Generates bounded churn scores (0 to 100) using a multi-factor heuristic model:
- **Overdue Invoices:** Adds up to 35 points depending on overdue count and balance.
- **Billing Failures / Past Due:** Adds 25 points for payment gateway retries.
- **Subscription Pauses:** Adds 20 points.
- **Inactivity (>60 days without interaction):** Adds 30 points.
- **Output:** Categorized into `Low` (<35), `Medium` (35-65), and `High` (>65) with explicit factor breakdowns and recommended retention plays.

### 2.3 Upsell & Expansion Engine (`upsellService.js`)
Analyzes active subscription tiers and identifies logical upgrade paths into higher plans:
- Computes potential additional monthly/annual revenue.
- Prioritizes accounts based on payment health and subscription tenure (>3 months).

### 2.4 Personalized Outreach Email Drafter (`messageGeneratorService.js`)
Drafts contextual communications:
- Payment reminders with exact invoice numbers and balances.
- Renewal notices with upcoming renewal dates.
- Expansion proposals tailored to company size.

---

## 3. Test Verification Summary

From `server/tests/server.test.js`:
- **Workflow H:** Verified live assistant responses for revenue, churn risk, and deals pipeline.
- Verified that Churn Risk analysis produces bounded 0-100 scores with concrete explanations.
