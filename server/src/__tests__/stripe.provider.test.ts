import { describe, it, expect, vi, beforeEach } from 'vitest';

const sessions = {
  create: vi.fn(),
  retrieve: vi.fn(),
};

const constructEvent = vi.fn();

vi.mock('stripe', () => {
  class FakeStripe {
    checkout = { sessions };
    webhooks = { constructEvent };
    constructor(
      public key: string,
      public options?: unknown
    ) {}
  }
  return { default: FakeStripe };
});

const { stripeProvider, toMinorUnits } = await import('../services/payments/stripe.provider.js');

const baseRequest = {
  reference: 'FINSYTE-exp-1-1700000000-AB12CD',
  grossAmount: 102,
  netAmount: 100,
  platformFee: 2,
  currency: 'EUR',
  customerEmail: 'payer@example.com',
  customerName: 'Payer',
  description: 'Expense: Taxi',
  redirectUrl: 'https://app.example.com/return',
  destinationAccountId: 'acct_connected_1' as string | null,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
  sessions.create.mockResolvedValue({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/c/pay/cs_test_123',
  });
});

describe('stripe checkout creation', () => {
  it('sends the platform fee as an application fee on a destination charge', async () => {
    await stripeProvider.createCheckout(baseRequest);

    const [params] = sessions.create.mock.calls[0] as any;
    const data = params.payment_intent_data;

    expect(data.application_fee_amount).toBe(200);
    expect(data.transfer_data).toEqual({ destination: 'acct_connected_1' });
  });

  it('bills the client the expense plus the fee as separate line items', async () => {
    await stripeProvider.createCheckout(baseRequest);

    const [params] = sessions.create.mock.calls[0] as any;
    expect(params.line_items).toHaveLength(2);
    expect(params.line_items[0].price_data.unit_amount).toBe(10000);
    expect(params.line_items[0].price_data.product_data.name).toBe('Expense: Taxi');
    expect(params.line_items[1].price_data.unit_amount).toBe(200);
    expect(params.line_items[1].price_data.product_data.name).toBe('Platform fee');
    expect(params.line_items[1].price_data.currency).toBe('eur');
  });

  it('omits the fee line item when there is no fee', async () => {
    await stripeProvider.createCheckout({ ...baseRequest, platformFee: 0, grossAmount: 100 });

    const [params] = sessions.create.mock.calls[0] as any;
    expect(params.line_items).toHaveLength(1);
  });

  it('leaves the whole amount on the platform when there is no connected account', async () => {
    await stripeProvider.createCheckout({ ...baseRequest, destinationAccountId: null });

    const [params] = sessions.create.mock.calls[0] as any;
    expect(params.payment_intent_data.transfer_data).toBeUndefined();
    expect(params.payment_intent_data.application_fee_amount).toBeUndefined();
  });

  it('carries the reference in metadata and as the idempotency key', async () => {
    await stripeProvider.createCheckout(baseRequest);

    const [params, options] = sessions.create.mock.calls[0] as any;
    expect(params.metadata).toEqual({ reference: baseRequest.reference });
    expect(options.idempotencyKey).toBe(`checkout-${baseRequest.reference}`);
  });

  it('uses payment mode and the redirect as both success and cancel urls', async () => {
    await stripeProvider.createCheckout(baseRequest);

    const [params] = sessions.create.mock.calls[0] as any;
    expect(params.mode).toBe('payment');
    expect(params.success_url).toBe(baseRequest.redirectUrl);
    expect(params.cancel_url).toBe(baseRequest.redirectUrl);
  });

  it('fails loudly when stripe returns no checkout url', async () => {
    sessions.create.mockResolvedValue({ id: 'cs_test_123', url: null });

    await expect(stripeProvider.createCheckout(baseRequest)).rejects.toThrow(/checkout URL/i);
  });

  it('refuses to create a checkout when the secret key is missing', async () => {
    delete process.env.STRIPE_SECRET_KEY;

    await expect(stripeProvider.createCheckout(baseRequest)).rejects.toThrow(/STRIPE_SECRET_KEY/);
  });
});

describe('stripe minor unit conversion', () => {
  it('uses two decimals for most currencies', () => {
    expect(toMinorUnits(10.5, 'EUR')).toBe(1050);
    expect(toMinorUnits(102, 'USD')).toBe(10200);
  });

  it('uses whole units for zero decimal currencies', () => {
    expect(toMinorUnits(1500, 'JPY')).toBe(1500);
    expect(toMinorUnits(1500, 'KRW')).toBe(1500);
    expect(toMinorUnits(1500.4, 'JPY')).toBe(1500);
  });
});

describe('stripe webhook signature verification', () => {
  const raw = '{"id":"evt_1"}';

  it('accepts a signature the sdk validates', () => {
    constructEvent.mockReturnValue({ id: 'evt_1', type: 'checkout.session.completed', created: 1700000000 });

    const ok = stripeProvider.verifySignature({
      rawBody: raw,
      body: {},
      headers: { 'stripe-signature': 't=1,v1=abc' },
    });

    expect(ok).toBe(true);
    expect(constructEvent).toHaveBeenCalledWith(raw, 't=1,v1=abc', 'whsec_123');
  });

  it('rejects a signature the sdk throws on', () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    const ok = stripeProvider.verifySignature({
      rawBody: raw,
      body: {},
      headers: { 'stripe-signature': 't=1,v1=forged' },
    });

    expect(ok).toBe(false);
  });

  it('rejects when the signature header is missing', () => {
    const ok = stripeProvider.verifySignature({ rawBody: raw, body: {}, headers: {} });
    expect(ok).toBe(false);
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it('rejects when the endpoint secret is not configured', () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const ok = stripeProvider.verifySignature({
      rawBody: raw,
      body: {},
      headers: { 'stripe-signature': 't=1,v1=abc' },
    });

    expect(ok).toBe(false);
  });
});

describe('stripe webhook parsing', () => {
  const signedRequest = (raw: string) => ({ rawBody: raw, body: {}, headers: { 'stripe-signature': 't=1,v1=abc' } });

  it('reports a completed checkout as a successful payment', () => {
    constructEvent.mockReturnValue({
      id: 'evt_1',
      created: 1700000000,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_status: 'paid',
          payment_intent: 'pi_test_123',
        },
      },
    });

    const event = stripeProvider.parseWebhook(signedRequest('{}'));

    expect(event.type).toBe('payment.succeeded');
    expect(event.reference).toBe('cs_test_123');
    expect(event.transactionId).toBe('pi_test_123');
    expect(event.paidAt).toEqual(new Date(1700000000 * 1000));
  });

  it('treats an unpaid completed session as a failure', () => {
    constructEvent.mockReturnValue({
      id: 'evt_1',
      created: 1700000000,
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123', payment_status: 'unpaid', payment_intent: null } },
    });

    const event = stripeProvider.parseWebhook(signedRequest('{}'));
    expect(event.type).toBe('payment.failed');
  });

  it('ignores unrelated event types', () => {
    constructEvent.mockReturnValue({ id: 'evt_1', created: 1, type: 'customer.created', data: { object: {} } });

    const event = stripeProvider.parseWebhook(signedRequest('{}'));
    expect(event.type).toBe('ignored');
    expect(event.reference).toBeNull();
  });
});

describe('stripe reference verification', () => {
  it('confirms a paid session', async () => {
    sessions.retrieve.mockResolvedValue({
      id: 'cs_test_123',
      payment_status: 'paid',
      payment_intent: 'pi_test_123',
      amount_total: 10200,
      currency: 'eur',
      created: 1700000000,
    });

    const result = await stripeProvider.verifyByReference('cs_test_123');

    expect(result.status).toBe('completed');
    expect(result.transactionId).toBe('pi_test_123');
    expect(result.amount).toBe(102);
    expect(result.currency).toBe('EUR');
  });

  it('reports an unpaid session as still pending', async () => {
    sessions.retrieve.mockResolvedValue({
      id: 'cs_test_123',
      payment_status: 'unpaid',
      payment_intent: null,
      amount_total: 10200,
      currency: 'eur',
      created: 1700000000,
    });

    const result = await stripeProvider.verifyByReference('cs_test_123');

    expect(result.status).toBe('pending');
    expect(result.transactionId).toBeNull();
  });
});
