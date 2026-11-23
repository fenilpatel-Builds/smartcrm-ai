# SmartCRM AI — Automation Engine Report (Phase 2)

**Evaluation Date:** November 23, 2026  
**Module:** Workflow Automation Engine (`server/services/automation/automationEngineService.js`)  
**Trigger Architecture:** Event-Driven Pub/Sub with Idempotency & Debounce Protection  
**Status:** **Fully Implemented, Integrated & Verified**

---

## 1. Overview & Architectural Goal

The SmartCRM Automation Engine allows businesses to eliminate manual CRM busywork by automating tasks, alerts, notifications, and webhooks whenever sales or subscription milestones occur.

---

## 2. Event Dispatching & Trigger Types

The engine supports the following triggers:

| Trigger Identifier | Trigger Source | Description |
|---|---|---|
| `deal_won` | Deals Controller | Fired when a sales deal reaches `closed_won` stage |
| `deal_created` | Deals Controller | Fired upon new deal creation |
| `deal_stage_changed` | Deals Controller | Fired when a deal moves between pipeline stages |
| `lead_created` | Leads Controller | Fired upon new lead capture or form submission |
| `lead_stage_changed` | Leads Controller | Fired when lead qualifies or converts |
| `subscription_created` | Subscription Service | Fired when a new recurring subscription starts |
| `subscription_cancelled` | Subscription Service | Fired when a customer cancels recurring billing |
| `subscription_expiring` | Cron / Scheduler | Fired within 7-14 days of subscription expiration |
| `ticket_created` | Support Controller | Fired upon incoming customer support ticket |
| `payment_failed` | Payment Service | Fired on invoice billing failure |

---

## 3. Condition Evaluation & Filtering

Rules support multi-criteria condition schemas:
- `equals`: Strict or relaxed equality check.
- `not_equals`: Inverted equality.
- `greater_than`: Numeric threshold evaluation (e.g., deal value > \$10,000).
- `less_than`: Numeric upper limit evaluation.
- `contains`: Substring matching (case-insensitive).
- `in`: Membership check in a predefined set.

---

## 4. Deduplication & Idempotency Protection

To prevent execution storms or duplicate tasks caused by rapid event replays:
1. Every execution is logged in `AutomationExecution` with `ruleId`, `entityId`, `triggerEvent`, and timestamp.
2. When a trigger fires for an entity (e.g., `deal_won` on Deal `123`), the engine checks whether the same rule executed on that entity within the previous 60 seconds.
3. If detected, the event is marked `skipped: true` with reason `Duplicate trigger suppressed within debounce window`.

---

## 5. Test Verification Summary

From `server/tests/server.test.js`:
- **Workflow F:** Verified execution of action `create_task` on `deal_won` condition `value > 10000`, followed by verification of duplicate suppression on immediate replay.
