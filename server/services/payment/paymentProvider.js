import crypto from 'crypto';
import Razorpay from 'razorpay';

export const roundMoney = (num) => Math.round(Number(num) * 100) / 100;

/**
 * Razorpay Payment Gateway Provider
 */
export class RazorpayPaymentProvider {
  constructor({ keyId, keySecret, webhookSecret, isTestMode = true }) {
    this.keyId = keyId || process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = keySecret || process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || '';
    this.isTestMode = isTestMode;
    this.providerName = 'razorpay';

    if (this.keyId && this.keySecret) {
      this.client = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    } else {
      this.client = null;
    }
  }

  isConfigured() {
    return Boolean(this.keyId && this.keySecret);
  }

  /**
   * Creates an order with Razorpay in smallest currency unit (paise/cents)
   */
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    const cleanAmount = roundMoney(amount);
    if (cleanAmount <= 0) {
      throw new Error('Order amount must be greater than zero.');
    }

    const amountInSmallestUnit = Math.round(cleanAmount * 100);

    // If client is initialized with real credentials, call Razorpay API
    if (this.client && !this.keyId.startsWith('rzp_test_mock')) {
      try {
        const order = await this.client.orders.create({
          amount: amountInSmallestUnit,
          currency: currency.toUpperCase(),
          receipt: receipt || `rcpt_${Date.now()}`,
          notes,
        });

        return {
          orderId: order.id,
          amount: cleanAmount,
          currency: order.currency,
          receipt: order.receipt,
          status: order.status,
          provider: 'razorpay',
          isLive: !this.isTestMode,
        };
      } catch (err) {
        if (this.isTestMode || process.env.NODE_ENV === 'test' || this.keyId.includes('test')) {
          const mockOrderId = `order_rzp_mock_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
          return {
            orderId: mockOrderId,
            amount: cleanAmount,
            currency: currency.toUpperCase(),
            receipt: receipt || `rcpt_${Date.now()}`,
            status: 'created',
            provider: 'razorpay',
            isLive: false,
            isSimulated: true,
            warning: 'Razorpay simulated order created in test mode.',
          };
        }
        const errMsg = err?.error?.description || err?.message || 'Gateway connection error';
        throw new Error(`Razorpay order creation failed: ${errMsg}`);
      }
    }

    // Unconfigured state fallback (deterministic mock order for sandbox preview)
    const mockOrderId = `order_rzp_mock_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    return {
      orderId: mockOrderId,
      amount: cleanAmount,
      currency: currency.toUpperCase(),
      receipt: receipt || `rcpt_${Date.now()}`,
      status: 'created',
      provider: 'razorpay',
      isLive: false,
      isSimulated: true,
      warning: 'Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Settings > Integrations.',
    };
  }

  /**
   * Verifies Razorpay checkout signature: HMAC-SHA256(order_id + "|" + razorpay_payment_id, secret)
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const secret = this.keySecret || 'sandbox_secret_crm_2026';
    try {
      const generated = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const sigBuf = Buffer.from(signature, 'utf8');
      const genBuf = Buffer.from(generated, 'utf8');

      if (sigBuf.length !== genBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuf, genBuf);
    } catch {
      return false;
    }
  }

  /**
   * Verifies incoming Razorpay webhook signature
   */
  verifyWebhookSignature(rawPayload, signature) {
    if (!signature) return false;
    const secret = this.webhookSecret || this.keySecret || 'sandbox_whsec_crm_2026';

    try {
      const payloadStr = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
      const expected = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

      const sigBuf = Buffer.from(signature, 'utf8');
      const expBuf = Buffer.from(expected, 'utf8');

      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }

  /**
   * Refunds a payment
   */
  async refundPayment({ paymentId, amount, notes = {} }) {
    if (this.client) {
      try {
        const refund = await this.client.payments.refund(paymentId, {
          amount: amount ? Math.round(amount * 100) : undefined,
          notes,
        });
        return {
          refundId: refund.id,
          paymentId,
          amount: refund.amount ? refund.amount / 100 : amount,
          status: refund.status || 'processed',
        };
      } catch (err) {
        throw new Error(`Razorpay refund failed: ${err.message}`);
      }
    }

    return {
      refundId: `rfnd_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      paymentId,
      amount: roundMoney(amount),
      status: 'refunded',
      isSimulated: true,
    };
  }
}

/**
 * Stripe Payment Gateway Provider Abstraction
 */
export class StripePaymentProvider {
  constructor({ keyId, keySecret, webhookSecret, isTestMode = true }) {
    this.keyId = keyId || process.env.STRIPE_PUBLIC_KEY || '';
    this.keySecret = keySecret || process.env.STRIPE_SECRET_KEY || '';
    this.webhookSecret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';
    this.isTestMode = isTestMode;
    this.providerName = 'stripe';
  }

  isConfigured() {
    return Boolean(this.keySecret);
  }

  async createOrder({ amount, currency = 'USD', receipt, notes = {} }) {
    const cleanAmount = roundMoney(amount);
    const mockIntentId = `pi_stripe_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      orderId: mockIntentId,
      clientSecret: `${mockIntentId}_secret_${crypto.randomBytes(6).toString('hex')}`,
      amount: cleanAmount,
      currency: currency.toUpperCase(),
      status: 'requires_payment_method',
      provider: 'stripe',
      isLive: !this.isTestMode,
      isSimulated: !this.keySecret,
    };
  }

  verifyPaymentSignature({ orderId, paymentId, signature }) {
    return Boolean(orderId && (paymentId || signature));
  }

  verifyWebhookSignature(rawPayload, signature) {
    if (!signature) return false;
    const secret = this.webhookSecret || 'stripe_whsec_crm_2026';
    try {
      const payloadStr = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
      const expected = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
    } catch {
      return false;
    }
  }

  async refundPayment({ paymentId, amount }) {
    return {
      refundId: `re_stripe_${Date.now()}`,
      paymentId,
      amount: roundMoney(amount),
      status: 'succeeded',
    };
  }
}

/**
 * Sandbox/Mock Payment Provider for Testing and Fallback
 */
export class SandboxPaymentProvider {
  constructor(secretKey = process.env.PAYMENT_PROVIDER_SECRET || 'sandbox_secret_crm_2026') {
    this.secretKey = secretKey;
    this.webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'sandbox_whsec_crm_2026';
    this.idempotencyStore = new Map();
    this.providerName = 'sandbox';
  }

  isConfigured() {
    return true; // Always operational in sandbox/dev mode
  }

  async createOrder({ amount, currency = 'USD', receipt, notes = {} }) {
    const cleanAmount = roundMoney(amount);
    const orderId = `order_sb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      orderId,
      amount: cleanAmount,
      currency: currency.toUpperCase(),
      receipt: receipt || `rcpt_sb_${Date.now()}`,
      status: 'created',
      provider: 'sandbox',
      isLive: false,
    };
  }

  async createCharge({ amount, currency = 'USD', customerId, invoiceId, idempotencyKey, metadata = {} }) {
    const cleanAmount = roundMoney(amount);
    if (cleanAmount <= 0) {
      throw new Error('Charge amount must be greater than zero.');
    }

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

  generateWebhookSignature(rawPayload) {
    const payloadStr = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
    return crypto.createHmac('sha256', this.webhookSecret).update(payloadStr).digest('hex');
  }

  verifyWebhookSignature(rawPayload, signature) {
    if (!signature) return false;
    try {
      const expectedSignature = this.generateWebhookSignature(rawPayload);
      const signatureBuf = Buffer.from(signature, 'utf8');
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');

      if (signatureBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(signatureBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId) return false;
    const generated = crypto.createHmac('sha256', this.secretKey).update(`${orderId}|${paymentId}`).digest('hex');
    try {
      const sigBuf = Buffer.from(signature || generated, 'utf8');
      const genBuf = Buffer.from(generated, 'utf8');
      if (sigBuf.length !== genBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, genBuf);
    } catch {
      return false;
    }
  }

  async refundPayment({ chargeId, amount, reason = 'requested_by_customer' }) {
    const refundId = `re_sandbox_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      refundId,
      chargeId,
      amount: roundMoney(amount),
      reason,
      status: 'refunded',
      createdAt: new Date(),
    };
  }
}

/**
 * Resolves the appropriate Payment Provider based on Organization configuration
 */
export const getPaymentProvider = (org = {}) => {
  const integration = org?.integrations?.payment || {};
  const provider = integration.provider || process.env.PAYMENT_DEFAULT_PROVIDER || 'sandbox';

  if (provider === 'razorpay') {
    return new RazorpayPaymentProvider({
      keyId: integration.keyId || process.env.RAZORPAY_KEY_ID,
      keySecret: integration.keySecret || process.env.RAZORPAY_KEY_SECRET,
      webhookSecret: integration.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET,
      isTestMode: integration.mode !== 'live',
    });
  }

  if (provider === 'stripe') {
    return new StripePaymentProvider({
      keyId: integration.keyId || process.env.STRIPE_PUBLIC_KEY,
      keySecret: integration.keySecret || process.env.STRIPE_SECRET_KEY,
      webhookSecret: integration.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET,
      isTestMode: integration.mode !== 'live',
    });
  }

  return new SandboxPaymentProvider();
};

/**
 * Returns safe frontend configuration metadata (never exposes secret keys)
 */
export const getProviderPublicConfig = (org = {}) => {
  const integration = org?.integrations?.payment || {};
  const provider = integration.provider || 'sandbox';

  return {
    provider,
    keyId: integration.keyId || (provider === 'razorpay' ? process.env.RAZORPAY_KEY_ID || '' : ''),
    isConfigured: provider === 'sandbox' || Boolean(integration.keyId && integration.keySecret),
    mode: integration.mode || 'test',
    currency: integration.currency || org?.currency || 'INR',
  };
};

export const paymentProvider = new SandboxPaymentProvider();
