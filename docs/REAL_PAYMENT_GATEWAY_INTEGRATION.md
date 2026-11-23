# SmartCRM AI — Real Payment Gateway Integration Architecture

## 1. Overview & Architecture

SmartCRM AI provides a unified, multi-provider payment gateway architecture supporting **Razorpay** (primary focus for INR/India compliance and UPI/Netbanking), **Stripe** (for international USD/EUR card payments), and a **deterministic Sandbox provider** for local testing and pre-flight validation.

```
+-----------------------------------------------------------------------------------------+
|                                    Client (React Vite)                                  |
|   - Pay Online Button (InvoiceList / SubscriptionView)                                  |
|   - Dynamic Gateway SDK Injection (Razorpay Checkout.js / Stripe Elements)              |
|   - Client-side payment authorization                                                   |
+-----------------------------------------------------------------------------------------+
                                          |
                         1. POST /api/v1/payments/create-order
                                          |
                                          v
+-----------------------------------------------------------------------------------------+
|                               Payment Controller & Service                              |
|   - Multi-tenant Organization Gateway Resolution (getPaymentProvider)                  |
|   - Invoice validation and balance check                                                |
|   - Order creation via Gateway SDK                                                      |
+-----------------------------------------------------------------------------------------+
                                          |
                        2. Order ID returned to client
                                          |
                                          v
+-----------------------------------------------------------------------------------------+
|                       Razorpay Checkout Modal (Customer Pays)                           |
|   - UPI / Cards / Netbanking / Wallets                                                  |
|   - Returns: razorpay_payment_id, razorpay_order_id, razorpay_signature                 |
+-----------------------------------------------------------------------------------------+
                                          |
                          3. POST /api/v1/payments/verify
                                          |
                                          v
+-----------------------------------------------------------------------------------------+
|                           Backend Verification Engine                                   |
|   - Cryptographic HMAC-SHA256 signature verification                                    |
|   - Idempotency guard (prevents double-crediting)                                       |
|   - Atomic Mongoose Transaction:                                                        |
|     * Creates Payment record (settled)                                                  |
|     * Marks Invoice as paid/partially_paid                                              |
|     * Extends Subscription currentPeriodEnd & nextRenewalDate                           |
|     * Updates Subscription status to active, paymentStatus to paid                      |
|     * Dispatches payment_receipt email and logs audit event                             |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Multi-Provider Gateway Abstraction

The gateway provider interface is defined in `server/services/payment/paymentProvider.js`:

```javascript
export class BasePaymentProvider {
  async createOrder({ amount, currency, receipt, notes }) { throw new Error('Not implemented'); }
  verifyPaymentSignature(params) { throw new Error('Not implemented'); }
  verifyWebhookSignature(rawPayload, signature) { throw new Error('Not implemented'); }
  async processRefund({ paymentId, amount, reason }) { throw new Error('Not implemented'); }
  getPublicConfig() { throw new Error('Not implemented'); }
}
```

### Supported Providers:
1. **`RazorpayPaymentProvider`**:
   - SDK: `razorpay` npm package.
   - Converts amounts to paise (INR amount * 100).
   - Generates and verifies HMAC-SHA256 signatures (`order_id + "|" + payment_id`).
   - Supports refunds through `client.payments.refund()`.
2. **`StripePaymentProvider`**:
   - Integrates with Stripe PaymentIntents API.
   - Computes smallest currency units (cents).
   - Verifies Stripe webhook signatures with HMAC-SHA256 timing-safe comparison.
3. **`SandboxPaymentProvider`**:
   - Built-in simulation provider for local test environments without live credentials.
   - Produces deterministic test order IDs and verified mock signatures.

---

## 3. Cryptographic Signature Verification

Tamper-proof signature verification ensures that payment confirmations received from clients cannot be forged:

```javascript
verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false;

  const secret = this.keySecret || 'sandbox_secret_crm_2026';
  try {
    const generated = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const genBuf = Buffer.from(generated, 'utf8');

    if (sigBuf.length !== genBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, genBuf);
  } catch {
    return false;
  }
}
```

---

## 4. Webhook Processing & Idempotency

Webhooks from Razorpay (`/api/v1/payments/webhook`) are processed asynchronously with idempotency guarantees:

1. **Webhook Signature Verification**: Computes HMAC-SHA256 of the raw webhook body against `RAZORPAY_WEBHOOK_SECRET`.
2. **Idempotency Guard**:
   ```javascript
   const existingPayment = await Payment.findOne({
     gatewayPaymentId: paymentId,
     status: 'completed',
   });
   if (existingPayment) {
     return { ignored: true, reason: 'Payment already processed' };
   }
   ```
3. **Supported Webhook Events**:
   - `payment.captured` / `order.paid`: Updates invoice to paid and activates subscription.
   - `payment.failed`: Sets subscription to `past_due`, flags invoice, creates high-priority alert notification.
   - `refund.processed`: Marks payment record as refunded with timestamp, reason, and refund ID.

---

## 5. Security & Secret Protection

- **Never Expose Secret Keys**: The endpoint `GET /api/v1/payments/config` returns only the public `keyId` and provider name. Secret keys (`keySecret`, `webhookSecret`) are masked (`••••••••`) and never returned over API responses.
- **Tenant Scope Enforcement**: Organization credentials can be stored encrypted per-tenant in `Organization.integrations.payment.razorpay`, falling back to server environment variables if tenant credentials are unset.
- **Timing-Safe Equality**: Buffer comparisons use `crypto.timingSafeEqual` to eliminate timing-attack vulnerabilities.
