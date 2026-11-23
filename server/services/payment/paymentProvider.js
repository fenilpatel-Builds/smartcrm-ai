import crypto from 'crypto';

/**
 * Payment Provider Interface & Sandbox Implementation
 * Implements charge creation, webhook verification, refunding, and idempotency control.
 */
export class SandboxPaymentProvider {
  constructor(secretKey = process.env.PAYMENT_PROVIDER_SECRET || 'sandbox_secret_crm_2026') {
    this.secretKey = secretKey;
    this.webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'sandbox_whsec_crm_2026';
    this.idempotencyStore = new Map();
  }

  /**
   * Helper to round currency amounts to 2 decimal places
   */
  roundMoney(amount) {
    return Math.round(Number(amount) * 100) / 100;
  }

  /**
   * Creates a charge with idempotency protection
   */
  async createCharge({ amount, currency = 'USD', customerId, invoiceId, idempotencyKey, metadata = {} }) {
    const cleanAmount = this.roundMoney(amount);
    if (cleanAmount <= 0) {
      throw new Error('Charge amount must be greater than zero.');
    }

    // Check idempotency store to prevent duplicate charges
    if (idempotencyKey && this.idempotencyStore.has(idempotencyKey)) {
      const cached = this.idempotencyStore.get(idempotencyKey);
      return {
        ...cached,
        isIdempotentReplay: true,
      };
    }

    const chargeId = `ch_sandbox_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const transactionReference = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const chargeResult = {
      chargeId,
      transactionReference,
      amount: cleanAmount,
      currency: currency.toUpperCase(),
      customerId,
      invoiceId,
      status: 'succeeded',
      captured: true,
      idempotencyKey,
      metadata,
      createdAt: new Date(),
    };

    if (idempotencyKey) {
      this.idempotencyStore.set(idempotencyKey, chargeResult);
    }

    return chargeResult;
  }

  /**
   * Generates a valid HMAC SHA-256 webhook signature for a payload
   */
  generateWebhookSignature(rawPayload) {
    const payloadStr = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
    return crypto.createHmac('sha256', this.webhookSecret).update(payloadStr).digest('hex');
  }

  /**
   * Verifies the HMAC SHA-256 webhook signature against the payload
   */
  verifyWebhookSignature(rawPayload, signature) {
    if (!signature) {
      return false;
    }

    try {
      const expectedSignature = this.generateWebhookSignature(rawPayload);
      const signatureBuf = Buffer.from(signature, 'utf8');
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');

      if (signatureBuf.length !== expectedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Refunds an existing charge
   */
  async refundPayment({ chargeId, amount, reason = 'requested_by_customer' }) {
    const refundId = `re_sandbox_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      refundId,
      chargeId,
      amount: this.roundMoney(amount),
      reason,
      status: 'refunded',
      createdAt: new Date(),
    };
  }
}

export const paymentProvider = new SandboxPaymentProvider();
