# SmartCRM AI — Email & Notification Integration Architecture

## 1. Executive Summary

Communication in SmartCRM AI is unified through an asynchronous communication hub providing:
1. **Outbound Email Dispatch**: Nodemailer-powered engine supporting direct SMTP, SES/Resend relays, and offline mock delivery for development and testing.
2. **Durable Email Logging**: Every dispatched email is tracked in MongoDB with status (`drafted`, `queued`, `sent`, `delivered`, `failed`, `bounced`), provider message ID, rendered content, and audit references.
3. **Responsive HTML Templates**: 6 pre-built responsive email templates designed for enterprise communications.
4. **In-App Notification Center**: Real-time alerts for subscription renewals, payment failures, SLA breaches, and workflow automation triggers with unread counters and mark-as-read workflows.

---

## 2. Email Delivery Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    Trigger Sources                                      |
|   - Manual Compose (CommunicationHub.jsx)                                               |
|   - Invoice Issuance (InvoiceController)                                                |
|   - Background Jobs (Renewal Reminder, Overdue Notice)                                  |
|   - Automation Rules (Deal Won, Ticket Status Changed)                                  |
+-----------------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------------+
|                              emailService.js (sendEmail)                                |
|   1. Verify monthly plan limits (Organization.planLimits.monthlyEmailAllowance)          |
|   2. Render HTML template with branded merge tags                                       |
|   3. Select transport (Custom SMTP credentials or environment default)                  |
|   4. Dispatch via Nodemailer                                                            |
|   5. Create durable EmailLog record with messageId & deliveryStatus                     |
|   6. Increment organization's monthly email usage counter                               |
+-----------------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------------+
|                                  Delivery & Tracking                                    |
|   - Delivered: Status 'sent', providerMessageId recorded                                |
|   - Failed: Status 'failed', errorMessage recorded without crashing caller              |
|   - In-app Notification created for recipient/admin                                     |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Responsive HTML Templates

Templates are authored with clean inline CSS and responsive table layouts ensuring 100% rendering fidelity across Apple Mail, Outlook, Gmail, and mobile clients:

| Template Identifier | Purpose | Dynamic Merge Fields |
| :--- | :--- | :--- |
| `customer_onboarding` | Welcomes newly converted customers | `customerName`, `brandName`, `loginUrl`, `accountExecutive` |
| `invoice_notice` | Delivers new invoice notice with amount & due date | `customerName`, `brandName`, `invoiceNumber`, `amount`, `dueDate`, `paymentUrl` |
| `renewal_reminder` | Warns 7/3 days before subscription auto-renewal | `customerName`, `brandName`, `planName`, `amount`, `renewalDate` |
| `payment_failed` | Alerts customer of failed charge with retry link | `customerName`, `brandName`, `invoiceNumber`, `retryUrl` |
| `ticket_update` | Notifies customer/staff of support ticket replies | `customerName`, `brandName`, `ticketNumber`, `subject`, `updateText` |
| `custom` | Free-form email with brand header & footer | `brandName`, `subject`, `message`, `html` |

---

## 4. Durable EmailLog Schema

Every email creates a permanent record in MongoDB:

```javascript
{
  organizationId: ObjectId,
  recipient: {
    email: "client@acme.com",
    name: "John Doe",
    customerId: ObjectId,
    contactId: ObjectId
  },
  sender: {
    email: "billing@apexcloud.com",
    name: "Apex Cloud Billing",
    userId: ObjectId
  },
  subject: "New Invoice #INV-2026-999 from Apex Cloud",
  templateType: "invoice_notice",
  bodyHtml: "<table ...>...</table>",
  bodyText: "New Invoice #INV-2026-999...",
  status: "sent", // drafted | queued | sent | delivered | failed | bounced
  provider: "smtp",
  providerMessageId: "<883492.1700000000@mail.server>",
  errorMessage: "",
  sentAt: "2026-11-23T11:00:00.000Z",
  openedAt: null
}
```

---

## 5. In-App Notification Center

Notifications alert users in real time with an unread badge on the top navbar:

- **Categories**: `renewal`, `overdue_payment`, `churn_alert`, `task_reminder`, `lead_activity`, `system`, `info`.
- **API Endpoints**:
  - `GET /api/v1/notifications`: Returns user's unread & read alerts.
  - `PATCH /api/v1/notifications/:id/read`: Marks a single notification as read.
  - `POST /api/v1/notifications/mark-all-read`: Clears unread counter for the session.
