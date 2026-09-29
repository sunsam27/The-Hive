import Stripe from 'stripe';
import type {
  AccountStatus,
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  ProviderTransaction,
  WebhookEvent,
  WebhookRequestLike,
} from './types.js';

const ROUTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON',
  'BGN', 'HRK', 'ISK', 'RUB', 'TRY', 'UAH', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD',
  'JPY', 'CNY', 'INR', 'KRW', 'TWD', 'THB', 'MYR', 'PHP', 'IDR', 'VND', 'AED',
  'SAR', 'QAR', 'ILS', 'EGP', 'MAD', 'TND', 'KES', 'GHS', 'ZAR', 'NGN', 'BRL',
  'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'ZMW', 'RWF', 'UGX', 'TZS', 'GMD', 'MUR',
] as const;

const CURRENCY_SET = new Set<string>(ROUTED_CURRENCIES);

const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF',
  'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

const SIGNATURE_HEADER = 'stripe-signature';

let client: Stripe | null = null;

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Stripe not configured: STRIPE_SECRET_KEY must be set');
  if (!client) client = new Stripe(secretKey, { apiVersion: '2026-08-26.dahlia' });
  return client;
}

function getClient(): Stripe {
  return getStripeClient();
}

export function mapStripeAccountStatus(account: {
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  details_submitted?: boolean | null;
}): AccountStatus {
  if (account.charges_enabled && account.payouts_enabled) return 'active';
  if (!account.details_submitted) return 'pending';
  return 'restricted';
}

export function toMinorUnits(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(String(currency).toUpperCase())
    ? Math.round(amount)
    : Math.round(amount * 100);
}

function toMajorUnits(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(String(currency).toUpperCase())
    ? amount
    : amount / 100;
}

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | null {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

export const stripeProvider: PaymentProvider = {
  name: 'stripe',
  routedCurrencies: ROUTED_CURRENCIES,

  isConfigured() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  },

  supportsCurrency(currency) {
    return CURRENCY_SET.has(String(currency || 'USD').toUpperCase());
  },

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const stripe = getClient();
    const currency = String(request.currency || 'USD').toLowerCase();

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: toMinorUnits(request.netAmount, request.currency),
          product_data: {
            name: request.description || 'Expense reimbursement',
          },
        },
      },
    ];

    if (request.platformFee > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: toMinorUnits(request.platformFee, request.currency),
          product_data: { name: 'Platform fee' },
        },
      });
    }

    const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {};
    if (request.destinationAccountId) {
      paymentIntentData.application_fee_amount = toMinorUnits(request.platformFee, request.currency);
      paymentIntentData.transfer_data = { destination: request.destinationAccountId };
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lineItems,
        customer_email: request.customerEmail,
        payment_intent_data: paymentIntentData,
        success_url: request.redirectUrl,
        cancel_url: request.redirectUrl,
        metadata: { reference: request.reference },
      },
      { idempotencyKey: `checkout-${request.reference}` }
    );

    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return { reference: request.reference, checkoutUrl: session.url, providerSessionId: session.id };
  },

  async verifyByReference(reference: string, providerSessionId?: string | null): Promise<ProviderTransaction> {
    const pending: ProviderTransaction = {
      reference,
      transactionId: null,
      status: 'pending',
      amount: null,
      currency: null,
      paidAt: null,
    };

    if (!providerSessionId || !providerSessionId.startsWith('cs_')) return pending;

    const stripe = getClient();
    const session = await stripe.checkout.sessions.retrieve(providerSessionId);

    const paid = session.payment_status === 'paid';
    const intentId =
      typeof session.payment_intent === 'string' ? session.payment_intent : null;

    return {
      reference,
      transactionId: paid ? intentId : null,
      status: paid ? 'completed' : 'pending',
      amount: typeof session.amount_total === 'number' ? toMajorUnits(session.amount_total, session.currency || 'USD') : null,
      currency: session.currency ? session.currency.toUpperCase() : null,
      paidAt: paid ? new Date((session.created || 0) * 1000) : null,
    };
  },

  verifySignature(request: WebhookRequestLike): boolean {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = readHeader(request.headers, SIGNATURE_HEADER);
    if (!webhookSecret || !signature || !request.rawBody) return false;
    try {
      getClient().webhooks.constructEvent(request.rawBody, signature, webhookSecret);
      return true;
    } catch {
      return false;
    }
  },

  parseWebhook(request: WebhookRequestLike): WebhookEvent {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = readHeader(request.headers, SIGNATURE_HEADER);
    if (!webhookSecret || !signature || !request.rawBody) {
      return { type: 'ignored', reference: null, transactionId: null, paidAt: null, raw: request.body };
    }

    let event: Stripe.Event;
    try {
      event = getClient().webhooks.constructEvent(request.rawBody, signature, webhookSecret);
    } catch {
      return { type: 'ignored', reference: null, transactionId: null, paidAt: null, raw: request.body };
    }

    if (event.type === 'account.updated') {
      const account = event.data.object as Stripe.Account;
      return {
        type: 'account.updated',
        reference: null,
        transactionId: null,
        paidAt: new Date(event.created * 1000),
        raw: event,
        accountUpdate: {
          providerAccountId: account.id,
          status: mapStripeAccountStatus(account),
          detailsSubmitted: Boolean(account.details_submitted),
          chargesEnabled: Boolean(account.charges_enabled),
          payoutsEnabled: Boolean(account.payouts_enabled),
          businessName: account.business_profile?.name ?? account.settings?.dashboard.display_name ?? null,
        },
      };
    }

    if (event.type !== 'checkout.session.completed') {
      return { type: 'ignored', reference: null, transactionId: null, paidAt: null, raw: request.body };
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
    const paid = session.payment_status === 'paid';

    return {
      type: paid ? 'payment.succeeded' : 'payment.failed',
      reference: session.metadata?.reference ?? session.id,
      transactionId: intentId,
      paidAt: new Date(event.created * 1000),
      raw: event,
    };
  },
};
