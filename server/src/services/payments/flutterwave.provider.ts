import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  ProviderTransaction,
  WebhookEvent,
  WebhookRequestLike,
} from './types.js';

const FLW_API = 'https://api.flutterwave.com/v3';

const ROUTED_CURRENCIES = [
  'USD', 'NGN', 'GHS', 'ZAR', 'KES', 'EGP', 'RWF', 'XOF', 'XAF', 'ZMW',
  'UGX', 'TZS', 'MZN', 'GMD', 'MWK', 'MUR', 'GNF', 'SOS', 'ZWL', 'SLL',
] as const;

const CURRENCY_SET = new Set<string>(ROUTED_CURRENCIES);

const SIGNATURE_HEADER = 'flutterwave-signature';
const LEGACY_SIGNATURE_HEADER = 'verif-hash';

interface FlutterwaveResponse {
  status?: string;
  message?: string;
  data?: {
    link?: string;
    id?: number | string;
    status?: string;
    amount?: number;
    currency?: string;
    created_at?: string;
  } | Array<{
    id?: number | string;
    status?: string;
    amount?: number;
    currency?: string;
    created_at?: string;
  }>;
}

const webhookSchema = z.object({
  event: z.string(),
  data: z
    .object({
      id: z.union([z.number(), z.string()]),
      tx_ref: z.string().optional(),
      status: z.string().optional(),
      amount: z.union([z.number(), z.string()]).optional(),
      currency: z.string().optional(),
      created_at: z.string().optional(),
    })
    .optional(),
});

function getSecretKey(): string {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) throw new Error('Flutterwave not configured: FLW_SECRET_KEY must be set');
  return secretKey;
}

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | null {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

function toNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function toDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const flutterwaveProvider: PaymentProvider = {
  name: 'flutterwave',
  routedCurrencies: ROUTED_CURRENCIES,

  isConfigured() {
    return Boolean(process.env.FLW_PUBLIC_KEY && process.env.FLW_SECRET_KEY);
  },

  supportsCurrency(currency) {
    return CURRENCY_SET.has(String(currency || 'USD').toUpperCase());
  },

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const body: Record<string, unknown> = {
      tx_ref: request.reference,
      amount: request.grossAmount,
      currency: String(request.currency || 'USD').toUpperCase(),
      redirect_url: request.redirectUrl,
      customer: {
        email: request.customerEmail,
        name: request.customerName,
      },
    };

    if (request.destinationAccountId) {
      body.subaccounts = [
        {
          id: request.destinationAccountId,
          transaction_charge_type: 'flat',
          transaction_charge: request.platformFee,
        },
      ];
    }

    const res = await fetch(`${FLW_API}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getSecretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as FlutterwaveResponse;
    if (json.status !== 'success') {
      throw new Error(json.message || 'Payment initialization failed');
    }

    const checkoutUrl = Array.isArray(json.data) ? undefined : json.data?.link;
    if (!checkoutUrl) {
      throw new Error('Flutterwave did not return a checkout link');
    }
    return { reference: request.reference, checkoutUrl };
  },

  async verifyByReference(reference: string): Promise<ProviderTransaction> {
    const res = await fetch(
      `${FLW_API}/transactions?tx_ref=${encodeURIComponent(reference)}&per_page=10`,
      { headers: { Authorization: `Bearer ${getSecretKey()}` } }
    );

    const json = (await res.json()) as FlutterwaveResponse;
    if (json.status !== 'success') {
      throw new Error(json.message || 'Transaction lookup failed');
    }

    const rows = Array.isArray(json.data) ? json.data : [];
    const successful = rows.find((row) => row?.status === 'successful');

    if (!successful) {
      return {
        reference,
        transactionId: null,
        status: rows.length > 0 ? 'failed' : 'pending',
        amount: null,
        currency: null,
        paidAt: null,
      };
    }

    return {
      reference,
      transactionId: String(successful.id),
      status: 'completed',
      amount: toNumber(successful.amount),
      currency: typeof successful.currency === 'string' ? successful.currency : null,
      paidAt: toDate(successful.created_at),
    };
  },

  verifySignature(request: WebhookRequestLike): boolean {
    const secretHash = process.env.FLW_SECRET_HASH;
    if (!secretHash) return false;
    if (!request.rawBody) return false;

    const signed = readHeader(request.headers, SIGNATURE_HEADER);
    if (signed) {
      const expected = createHmac('sha256', secretHash)
        .update(request.rawBody, 'utf8')
        .digest('base64');
      return safeEqual(signed, expected);
    }

    const legacy = readHeader(request.headers, LEGACY_SIGNATURE_HEADER);
    if (legacy) return safeEqual(legacy, secretHash);

    return false;
  },

  parseWebhook(request: WebhookRequestLike): WebhookEvent {
    const parsed = webhookSchema.safeParse(request.body);
    if (!parsed.success) {
      return { type: 'ignored', reference: null, transactionId: null, paidAt: null, raw: request.body };
    }

    const { event, data } = parsed.data;
    if (event !== 'charge.completed' || !data?.tx_ref) {
      return {
        type: 'ignored',
        reference: data?.tx_ref ?? null,
        transactionId: null,
        paidAt: null,
        raw: request.body,
      };
    }

    const status = data.status ?? 'successful';
    return {
      type: status === 'successful' ? 'payment.succeeded' : 'payment.failed',
      reference: data.tx_ref,
      transactionId: String(data.id),
      paidAt: toDate(data.created_at),
      raw: request.body,
    };
  },
};
