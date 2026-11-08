// Payment Service — Razorpay Sandbox + Demo Simulation fallback
// DISCLAIMER: This is an academic demonstration system.
// When RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set, real sandbox API calls are made.
// Without those env vars, the system falls back to a clearly-labelled DEMO simulation mode.
// No actual money is ever processed in either case during academic demonstration.

import crypto from 'crypto';
import { generateTransactionId } from '../utils/pnr.js';

// Razorpay is a CJS module. We import the class via createRequire so TSC is satisfied.
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RazorpaySDK = _require('razorpay') as typeof import('razorpay');

// ── Mode Detection ─────────────────────────────────────────────────────────
const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export type PaymentMode = 'SANDBOX' | 'DEMO';

export function getPaymentMode(): PaymentMode {
  return RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET ? 'SANDBOX' : 'DEMO';
}

// ── Razorpay lazy singleton ────────────────────────────────────────────────
let razorpayInstance: InstanceType<typeof RazorpaySDK> | null = null;

function getRazorpay(): InstanceType<typeof RazorpaySDK> {
  if (!razorpayInstance) {
    razorpayInstance = new RazorpaySDK({
      key_id: RAZORPAY_KEY_ID!,
      key_secret: RAZORPAY_KEY_SECRET!,
    });
  }
  return razorpayInstance;
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface CreateOrderInput {
  booking_id: number;
  pnr_number: string;
  amount_rupees: number;      // e.g. 1250.50
  currency?: string;          // default 'INR'
}

export interface CreateOrderResult {
  mode: PaymentMode;
  order_id: string;           // Razorpay order_id or demo token
  amount_paise: number;       // amount × 100
  currency: string;
  key_id: string;             // public key to pass to Razorpay checkout (or 'DEMO')
  receipt: string;
  disclaimer: string;
}

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResult {
  valid: boolean;
  mode: PaymentMode;
  transaction_id: string;
}

// ── Service Functions ──────────────────────────────────────────────────────

/**
 * Create a payment order.
 * - SANDBOX mode: creates a real Razorpay order using the sandbox API
 * - DEMO mode: returns a mock order object (clearly labelled)
 */
export async function createPaymentOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const { booking_id, pnr_number, amount_rupees, currency = 'INR' } = input;
  const amount_paise = Math.round(amount_rupees * 100);
  const receipt = `${pnr_number}-${booking_id}`;

  if (getPaymentMode() === 'SANDBOX') {
    const rp = getRazorpay();
    const order = await rp.orders.create({
      amount: amount_paise,
      currency,
      receipt,
      notes: {
        booking_id: String(booking_id),
        pnr_number,
        system: 'RailReserve-Demo-CSE2271',
      },
    });

    return {
      mode: 'SANDBOX',
      order_id: order.id,
      amount_paise,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID!,
      receipt,
      disclaimer:
        '⚠️ RAZORPAY SANDBOX MODE — Test cards only. No real money is processed.',
    };
  }

  // DEMO mode — return a mock object without calling any external API
  const demoOrderId = `demo_order_${generateTransactionId()}_${booking_id}`;
  return {
    mode: 'DEMO',
    order_id: demoOrderId,
    amount_paise,
    currency,
    key_id: 'DEMO',
    receipt,
    disclaimer:
      '⚠️ DEMO MODE — Simulated payment only. No real money or Razorpay API involved. ' +
      'Set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET env vars to enable Razorpay sandbox.',
  };
}

/**
 * Verify a Razorpay payment webhook signature.
 * - SANDBOX mode: verifies the HMAC-SHA256 signature
 * - DEMO mode: accepts demo tokens and returns valid=true
 */
export async function verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = input;
  const secret = process.env.RAZORPAY_KEY_SECRET || 'dev_secret_key_railreserve_2026';

  if (razorpay_signature) {
    // Razorpay signature verification per documentation: HMAC-SHA256(order_id|payment_id, secret)
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const valid = expectedSignature === razorpay_signature;
    return {
      valid,
      mode: getPaymentMode(),
      transaction_id: valid ? razorpay_payment_id : '',
    };
  }

  // Pure DEMO mode simulation without cryptographic signature
  const isDemoPayment = razorpay_payment_id.startsWith('demo_') || razorpay_payment_id.startsWith('pay_');
  return {
    valid: isDemoPayment,
    mode: 'DEMO',
    transaction_id: isDemoPayment ? razorpay_payment_id : '',
  };
}

/**
 * Verify a Razorpay webhook event signature.
 * Used for /api/payments/webhook POST endpoint.
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'dev_webhook_secret_railreserve_2026';
  if (!webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  return expectedSignature === signature;
}
