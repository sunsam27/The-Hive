import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createHmac } from 'node:crypto';

process.env.FLW_PUBLIC_KEY = 'FLWPUBK-test';
process.env.FLW_SECRET_KEY = 'FLWSECK-test';
process.env.FLW_SECRET_HASH = 'a3f9c1d84b7e2056a3f9c1d84b7e2056';

type Q = { then: (fn: (value: any) => any) => Promise<any>; catch: (fn: (reason: any) => any) => Promise<any>; _queue: any[]; [key: string]: any };

vi.mock('../db/index.js', () => {
  function makeQ(queue: any[] = []): Q {
    const q: Q = (_table?: string) => q;
    q._queue = queue;
    q.then = (fn: (value: any) => any) => Promise.resolve(queue.shift()).then(fn);
    q.catch = (fn: (reason: any) => any) => Promise.resolve(undefined).catch(fn);
    q.where = () => q;
    q.whereIn = () => q;
    q.whereNot = () => q;
    q.first = vi.fn(() => q);
    q.select = () => q;
    q.insert = () => q;
    q.update = () => q;
    q.del = () => q;
    q.limit = () => q;
    q.offset = () => q;
    q.orderBy = () => q;
    q.clone = () => q;
    q.countDistinct = () => q;
    q.join = () => q;
    q.returning = vi.fn(() => q);
    return q;
  }

  const mainQueue: any[] = [];
  const trxQueue: any[] = [];
  makeQ(mainQueue);
  makeQ(trxQueue);

  const kn = (_table: string) => makeQ(mainQueue);
  kn.transaction = vi.fn().mockImplementation(async (cb: (t: Q) => void) => {
    const tq = makeQ(trxQueue);
    await cb(tq);
  });
  kn._reset = () => { mainQueue.length = 0; trxQueue.length = 0; };
  kn._push = (v: any) => mainQueue.push(v);
  kn._trxPush = (v: any) => trxQueue.push(v);

  return { default: kn };
});

vi.mock('../utils/accessControl.js', () => ({
  checkWorkspaceAccess: vi.fn().mockResolvedValue(true),
  checkExpenseAccess: vi.fn().mockResolvedValue(null),
  checkReviewerRole: vi.fn().mockResolvedValue(null),
}));

const { default: app } = await import('../app.js');
const accessControl = await import('../utils/accessControl.js');
const { checkPaymentConfig } = await import('../services/payments/config.js');
const { calculateFee } = await import('../services/payments/fees.js');
const { resolveProvider, currencyCapabilities } = await import('../services/payments/registry.js');
const { flutterwaveProvider } = await import('../services/payments/flutterwave.provider.js');
const { stripeProvider } = await import('../services/payments/stripe.provider.js');

const kn = (await import('../db/index.js')).default as any;
const token = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
const authHeader = { Authorization: `Bearer ${token}` };

const mockExpense = {
  id: 'exp-1',
  workspace_id: 'ws-1',
  status: 'approved',
  amount: '100.00',
  currency: 'USD',
  submitter_id: 'freelancer-1',
};

const mockUser = { id: 'user-1', email: 'payer@example.com', name: 'Payer' };

function linkedAccount(provider: string, providerAccountId: string) {
  return {
    id: `pa-${provider}`,
    user_id: 'freelancer-1',
    provider,
    provider_account_id: providerAccountId,
    status: 'active',
    details_submitted: true,
    charges_enabled: true,
    payouts_enabled: true,
  };
}

const mockFreelancer = linkedAccount('stripe', 'acct_connected_1');

const SECRET_HASH = 'a3f9c1d84b7e2056a3f9c1d84b7e2056';
const STRIPE_SECRET = 'sk_test_placeholder_for_unit_tests_only';
const STRIPE_WEBHOOK = 'local-unit-test-webhook-signing-value';

// Assembled at runtime so no literal live-key-looking value exists in source.
// GitHub push protection blocks any push containing one of these patterns.
const STRIPE_LIVE_LOOKING = ['sk', 'live', 'a'.repeat(32)].join('_');
const STRIPE_LIVE_LOOKING_SHORT = ['sk', 'live', 'b'.repeat(16)].join('_');
const STRIPE_WEBHOOK_LOOKING = ['whsec', 'd'.repeat(24)].join('_');
const FLW_SECRET_LOOKING = ['FLWSECK', '0'.repeat(32), 'X'].join('-');
const FLW_LIVE_LOOKING = ['FLWSECK', 'live', '0'.repeat(16), 'X'].join('-');

function signCurrent(raw: string): string {
  return createHmac('sha256', SECRET_HASH).update(raw, 'utf8').digest('base64');
}

function chargePayload(txRef: string) {
  return {
    event: 'charge.completed',
    data: {
      id: 987654,
      tx_ref: txRef,
      status: 'successful',
      amount: 100,
      currency: 'USD',
      created_at: '2026-06-01T10:00:00.000Z',
    },
  };
}

const checkoutLink = 'https://checkout.flutterwave.com/test-abc';

beforeEach(() => {
  vi.clearAllMocks();
  kn._reset();
  vi.mocked(accessControl.checkWorkspaceAccess).mockResolvedValue(true);
  process.env.FLW_PUBLIC_KEY = 'FLWPUBK-test';
  process.env.FLW_SECRET_KEY = 'FLWSECK-test';
  process.env.FLW_SECRET_HASH = SECRET_HASH;
  process.env.STRIPE_SECRET_KEY = STRIPE_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK;
  process.env.PLATFORM_FEE_RATE = '0.02';
  delete process.env.PLATFORM_FEE_MIN;
  delete process.env.PLATFORM_FEE_MIN_USD;
  delete process.env.PLATFORM_FEE_MIN_NGN;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/payments/webhook/flutterwave', () => {
  it('rejects a request with no signature header', async () => {
    const raw = JSON.stringify(chargePayload('FINSYTE-ref-1'));

    const res = await request(app)
      .post('/api/payments/webhook/flutterwave')
      .set('Content-Type', 'application/json')
      .send(raw);

    expect(res.status).toBe(401);
  });

  it('rejects a request signed with the wrong algorithm', async () => {
    const raw = JSON.stringify(chargePayload('FINSYTE-ref-1'));
    const wrongAlgorithm = createHmac('sha512', SECRET_HASH).update(raw, 'utf8').digest('hex');

    const res = await request(app)
      .post('/api/payments/webhook/flutterwave')
      .set('Content-Type', 'application/json')
      .set('flutterwave-signature', wrongAlgorithm)
      .send(raw);

    expect(res.status).toBe(401);
  });

  it('accepts the current base64 sha256 signature header', async () => {
    const raw = JSON.stringify(chargePayload('FINSYTE-ref-1'));
    kn._push({ id: 'pay-1', expense_id: 'exp-1', workspace_id: 'ws-1', payer_id: 'user-1', status: 'pending' });

    const res = await request(app)
      .post('/api/payments/webhook/flutterwave')
      .set('Content-Type', 'application/json')
      .set('flutterwave-signature', signCurrent(raw))
      .send(raw);

    expect(res.status).toBe(200);
    expect(kn.transaction).toHaveBeenCalled();
  });

  it('still accepts the legacy verif-hash secret comparison', async () => {
    const raw = JSON.stringify(chargePayload('FINSYTE-ref-1'));
    kn._push({ id: 'pay-1', expense_id: 'exp-1', workspace_id: 'ws-1', payer_id: 'user-1', status: 'pending' });

    const res = await request(app)
      .post('/api/payments/webhook/flutterwave')
      .set('Content-Type', 'application/json')
      .set('verif-hash', SECRET_HASH)
      .send(raw);

    expect(res.status).toBe(200);
    expect(kn.transaction).toHaveBeenCalled();
  });

  it('rejects a tampered body even when a signature is present', async () => {
    const original = JSON.stringify(chargePayload('FINSYTE-ref-1'));
    const signature = signCurrent(original);
    const tampered = JSON.stringify(chargePayload('FINSYTE-ref-ATTACKER'));

    const res = await request(app)
      .post('/api/payments/webhook/flutterwave')
      .set('Content-Type', 'application/json')
      .set('flutterwave-signature', signature)
      .send(tampered);

    expect(res.status).toBe(401);
  });

  it('rejects a legacy header carrying the wrong secret', async () => {
    const raw = JSON.stringify(chargePayload('FINSYTE-ref-1'));

    const res = await request(app)
      .post('/api/payments/webhook/flutterwave')
      .set('Content-Type', 'application/json')
      .set('verif-hash', 'not-the-secret')
      .send(raw);

    expect(res.status).toBe(401);
  });

  it('rejects every webhook when FLW_SECRET_HASH is not configured', async () => {
    delete process.env.FLW_SECRET_HASH;
    const raw = JSON.stringify(chargePayload('FINSYTE-ref-1'));

    const res = await request(app)
      .post('/api/payments/webhook/flutterwave')
      .set('Content-Type', 'application/json')
      .set('flutterwave-signature', signCurrent(raw))
      .send(raw);

    expect(res.status).toBe(401);
  });

  it('is idempotent for an already completed payment', async () => {
    const raw = JSON.stringify(chargePayload('FINSYTE-ref-1'));
    kn._push({ id: 'pay-1', status: 'completed' });

    const res = await request(app)
      .post('/api/payments/webhook/flutterwave')
      .set('Content-Type', 'application/json')
      .set('flutterwave-signature', signCurrent(raw))
      .send(raw);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Already processed');
    expect(kn.transaction).not.toHaveBeenCalled();
  });

  it('rejects an unknown provider', async () => {
    const res = await request(app).post('/api/payments/webhook/notaprovider').send({});

    expect(res.status).toBe(404);
  });
});

describe('POST /api/payments/webhook/stripe', () => {
  it('rejects a request with no signature header', async () => {
    const res = await request(app)
      .post('/api/payments/webhook/stripe')
      .set('Content-Type', 'application/json')
      .send('{}');

    expect(res.status).toBe(401);
  });

  it('rejects a request with a forged signature', async () => {
    const res = await request(app)
      .post('/api/payments/webhook/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=deadbeef')
      .send('{}');

    expect(res.status).toBe(401);
  });

  it('rejects every stripe webhook when the endpoint secret is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await request(app)
      .post('/api/payments/webhook/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=deadbeef')
      .send('{}');

    expect(res.status).toBe(401);
  });
});

describe('platform fee calculation', () => {
  it('charges the stated percentage', () => {
    const fee = calculateFee(200, { rate: 0.02, minimum: 0, currency: 'USD' });
    expect(fee.platformFee).toBe(4);
    expect(fee.netAmount).toBe(200);
    expect(fee.grossAmount).toBe(204);
  });

  it('charges the minimum when the percentage is smaller', () => {
    const fee = calculateFee(10, { rate: 0.02, minimum: 1, currency: 'USD' });
    expect(fee.platformFee).toBe(1);
    expect(fee.grossAmount).toBe(11);
  });

  it('adds the fee on top of the expense amount', () => {
    const fee = calculateFee(100, { rate: 0.02, minimum: 1, currency: 'USD' });
    expect(fee.netAmount + fee.platformFee).toBe(fee.grossAmount);
  });

  it('reads the rate and minimum from the environment', () => {
    process.env.PLATFORM_FEE_RATE = '0.05';
    const fee = calculateFee(100, { minimum: 1, currency: 'USD' });
    expect(fee.platformFee).toBe(5);
  });

  it('supports a larger per-currency minimum', () => {
    process.env.PLATFORM_FEE_MIN_NGN = '500';
    const fee = calculateFee(5000, { rate: 0.02, currency: 'NGN' });
    expect(fee.platformFee).toBe(500);
    expect(fee.grossAmount).toBe(5500);
  });

  it('falls back to the shared minimum for other currencies', () => {
    process.env.PLATFORM_FEE_MIN = '0.5';
    expect(calculateFee(10, { rate: 0.02, currency: 'EUR' }).platformFee).toBe(0.5);
  });

  it('rounds to two decimal places', () => {
    const fee = calculateFee(33.33, { rate: 0.02, minimum: 0, currency: 'USD' });
    expect(fee.platformFee).toBe(0.67);
    expect(fee.grossAmount).toBe(34);
  });
});

describe('provider routing', () => {
  it('routes african currencies to flutterwave', () => {
    expect(resolveProvider('NGN').name).toBe('flutterwave');
    expect(resolveProvider('GHS').name).toBe('flutterwave');
    expect(resolveProvider('ZAR').name).toBe('flutterwave');
  });

  it('routes european currencies to stripe', () => {
    expect(resolveProvider('EUR').name).toBe('stripe');
    expect(resolveProvider('GBP').name).toBe('stripe');
  });

  it('routes usd to stripe by default', () => {
    expect(resolveProvider('USD').name).toBe('stripe');
  });

  it('honours an explicit default provider override', () => {
    process.env.PLATFORM_DEFAULT_PROVIDER = 'flutterwave';
    expect(resolveProvider('USD').name).toBe('flutterwave');
    delete process.env.PLATFORM_DEFAULT_PROVIDER;
  });
});

describe('currency capabilities', () => {
  it('reports the provider that resolveProvider will actually use', () => {
    const caps = currencyCapabilities();
    const byCode = new Map(caps.map((c) => [c.code, c]));

    // USD is claimed by both providers. It must be attributed to stripe,
    // because that is where resolveProvider sends it.
    expect(byCode.get('USD')?.provider).toBe(resolveProvider('USD').name);
    expect(byCode.get('NGN')?.provider).toBe('flutterwave');
    expect(byCode.get('EUR')?.provider).toBe('stripe');
  });

  it('agrees with resolveProvider for every currency it reports', () => {
    for (const cap of currencyCapabilities()) {
      expect(cap.provider).toBe(resolveProvider(cap.code).name);
    }
  });

  it('exposes every currency either provider claims', () => {
    const codes = currencyCapabilities().map((c) => c.code);
    for (const code of flutterwaveProvider.routedCurrencies) expect(codes).toContain(code);
    for (const code of stripeProvider.routedCurrencies) expect(codes).toContain(code);
  });

  it('groups african currencies apart from international ones', () => {
    const byCode = new Map(currencyCapabilities().map((c) => [c.code, c]));
    expect(byCode.get('NGN')?.group).toBe('africa');
    expect(byCode.get('USD')?.group).toBe('international');
  });

  it('marks a currency unavailable when its provider has no keys', () => {
    delete process.env.STRIPE_SECRET_KEY;
    const usd = currencyCapabilities().find((c) => c.code === 'USD');
    expect(usd?.available).toBe(false);
    expect(usd?.provider).toBe('stripe');

    const ngn = currencyCapabilities().find((c) => c.code === 'NGN');
    expect(ngn?.available).toBe(true);
  });

  it('is reachable through the authenticated capabilities route', async () => {
    const res = await request(app).get('/api/payments/capabilities').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const codes = res.body.currencies.map((c: any) => c.code);
    expect(codes).toContain('NGN');
    expect(codes).toContain('USD');
    for (const cap of res.body.currencies) {
      expect(cap).toHaveProperty('available');
      expect(cap).toHaveProperty('provider');
      expect(cap).toHaveProperty('group');
    }
  });

  it('requires authentication to read capabilities', async () => {
    const res = await request(app).get('/api/payments/capabilities');
    expect(res.status).toBe(401);
  });
});

describe('flutterwave split construction', () => {
  it('sends the platform fee as a flat commission to the freelancer subaccount', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'success', data: { link: checkoutLink } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await flutterwaveProvider.createCheckout({
      reference: 'FINSYTE-ref-1',
      grossAmount: 102,
      netAmount: 100,
      platformFee: 2,
      currency: 'NGN',
      customerEmail: 'payer@example.com',
      customerName: 'Payer',
      redirectUrl: 'https://app.example.com/return',
      destinationAccountId: 'RS_SUBACCOUNT_1',
    });

    const [, initArgs] = fetchMock.mock.calls[0] as any;
    const sentBody = JSON.parse(initArgs.body);
    expect(sentBody.amount).toBe(102);
    expect(sentBody.split).toBeUndefined();
    expect(sentBody.subaccounts).toEqual([
      {
        id: 'RS_SUBACCOUNT_1',
        transaction_charge_type: 'flat',
        transaction_charge: 2,
      },
    ]);
  });

  it('omits the split when there is no connected account', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'success', data: { link: checkoutLink } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await flutterwaveProvider.createCheckout({
      reference: 'FINSYTE-ref-1',
      grossAmount: 102,
      netAmount: 100,
      platformFee: 2,
      currency: 'NGN',
      customerEmail: 'payer@example.com',
      customerName: 'Payer',
      redirectUrl: 'https://app.example.com/return',
      destinationAccountId: null,
    });

    const [, initArgs] = fetchMock.mock.calls[0] as any;
    const sentBody = JSON.parse(initArgs.body);
    expect(sentBody.subaccounts).toBeUndefined();
  });
});

describe('POST /api/payments/initiate', () => {
  it('returns the stored checkout url when a payment is already pending', async () => {
    vi.stubGlobal('fetch', vi.fn());
    kn._push(mockExpense);
    kn._push({
      id: 'pay-1',
      provider_ref: 'FINSYTE-ref-1',
      checkout_url: checkoutLink,
    });

    const res = await request(app)
      .post('/api/payments/initiate')
      .set(authHeader)
      .send({ expenseId: 'exp-1' });

    expect(res.status).toBe(200);
    expect(res.body.paymentUrl).toBe(checkoutLink);
    expect(res.body.existing).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('charges the fee on top and reports the split amounts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'success', data: { link: checkoutLink } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    kn._push({ ...mockExpense, currency: 'NGN' });
    kn._push(undefined);
    kn._push(mockUser);
    kn._push({ id: 'ws-1', plan: 'free', paid_until: null }); // plan lookup for the fee rate
    kn._push(linkedAccount('flutterwave', 'RS_SUBACCOUNT_1'));

    const res = await request(app)
      .post('/api/payments/initiate')
      .set(authHeader)
      .send({ expenseId: 'exp-1' });

    expect(res.status).toBe(200);
    expect(res.body.netAmount).toBe(100);
    expect(res.body.platformFee).toBe(2);
    expect(res.body.grossAmount).toBe(102);
    expect(res.body.split).toBe('provider_split');

    const [, initArgs] = fetchMock.mock.calls[0] as any;
    const sentBody = JSON.parse(initArgs.body);
    expect(sentBody.amount).toBe(102);
    expect(sentBody.subaccounts[0].id).toBe('RS_SUBACCOUNT_1');
    expect(sentBody.subaccounts[0].transaction_charge).toBe(2);
  });

  it('falls back to a manual payout when the freelancer has no active account for the provider', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'success', data: { link: checkoutLink } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    kn._push({ ...mockExpense, currency: 'NGN' });
    kn._push(undefined);
    kn._push(mockUser);
    kn._push(undefined);

    const res = await request(app)
      .post('/api/payments/initiate')
      .set(authHeader)
      .send({ expenseId: 'exp-1' });

    expect(res.status).toBe(200);
    expect(res.body.split).toBe('manual_payout');

    const [, initArgs] = fetchMock.mock.calls[0] as any;
    expect(JSON.parse(initArgs.body).subaccounts).toBeUndefined();
  });

  it('issues a fresh checkout when the pending payment has no stored url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'success', data: { link: checkoutLink } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    kn._push({ ...mockExpense, currency: 'NGN' });
    kn._push({ id: 'pay-1', provider_ref: 'FINSYTE-stale', checkout_url: null });
    kn._push(mockUser);
    kn._push(mockFreelancer);

    const res = await request(app)
      .post('/api/payments/initiate')
      .set(authHeader)
      .send({ expenseId: 'exp-1' });

    expect(res.status).toBe(200);
    expect(res.body.paymentUrl).toBe(checkoutLink);
    expect(res.body.existing).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stores provider metadata on a new payment', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'success', data: { link: checkoutLink } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    kn._push({ ...mockExpense, currency: 'NGN' });
    kn._push(undefined);
    kn._push(mockUser);
    kn._push(mockFreelancer);

    const res = await request(app)
      .post('/api/payments/initiate')
      .set(authHeader)
      .send({ expenseId: 'exp-1' });

    expect(res.status).toBe(200);
    expect(res.body.paymentUrl).toBe(checkoutLink);

    const [, initArgs] = fetchMock.mock.calls[0] as any;
    const sentBody = JSON.parse(initArgs.body);
    expect(sentBody.currency).toBe('NGN');
    expect(sentBody.tx_ref).toMatch(/^FINSYTE-exp-1-\d+-[A-Z0-9]{6}$/);
  });

  it('rejects a currency no provider supports', async () => {
    kn._push({ ...mockExpense, currency: 'BTC' });

    const res = await request(app)
      .post('/api/payments/initiate')
      .set(authHeader)
      .send({ expenseId: 'exp-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('BTC');
  });

  it('returns 503 when the routed provider is not configured', async () => {
    delete process.env.FLW_SECRET_KEY;
    kn._push({ ...mockExpense, currency: 'NGN' });

    const res = await request(app)
      .post('/api/payments/initiate')
      .set(authHeader)
      .send({ expenseId: 'exp-1' });

    expect(res.status).toBe(503);
  });

  it('returns 403 without workspace access', async () => {
    vi.mocked(accessControl.checkWorkspaceAccess).mockResolvedValue(false);
    kn._push(mockExpense);

    const res = await request(app)
      .post('/api/payments/initiate')
      .set(authHeader)
      .send({ expenseId: 'exp-1' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/payments/verify/:reference', () => {
  it('returns completed immediately for a completed payment', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    kn._push({ id: 'pay-1', status: 'completed', paid_at: '2026-06-01T10:00:00.000Z' });

    const res = await request(app)
      .get('/api/payments/verify/FINSYTE-ref-1')
      .set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('recovers a lost webhook by asking the provider', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: 'success',
        data: [{ id: 555, status: 'successful', amount: 100, currency: 'USD', created_at: '2026-06-01T10:00:00.000Z' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    kn._push({
      id: 'pay-1',
      expense_id: 'exp-1',
      payer_id: 'user-1',
      status: 'pending',
      provider: 'flutterwave',
      provider_ref: 'FINSYTE-ref-1',
    });

    const res = await request(app)
      .get('/api/payments/verify/FINSYTE-ref-1')
      .set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(kn.transaction).toHaveBeenCalled();
  });

  it('returns 404 for an unknown reference', async () => {
    kn._push(undefined);

    const res = await request(app)
      .get('/api/payments/verify/FINSYTE-nope')
      .set(authHeader);

    expect(res.status).toBe(404);
  });
});

describe('payment config validation', () => {
  it('flags a missing flutterwave webhook secret', () => {
    delete process.env.FLW_SECRET_HASH;

    const issues = checkPaymentConfig();
    expect(issues.some((issue) => issue.message.includes('FLW_SECRET_HASH'))).toBe(true);
  });

  it('flags a placeholder flutterwave webhook secret', () => {
    process.env.FLW_SECRET_HASH = 'your-flutterwave-webhook-secret-hash';

    const issues = checkPaymentConfig();
    expect(issues.some((issue) => issue.message.includes('placeholder'))).toBe(true);
  });

  it('flags a placeholder stripe webhook secret', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'your-stripe-webhook-secret';

    const issues = checkPaymentConfig();
    expect(issues.some((issue) => issue.provider === 'stripe' && issue.message.includes('placeholder'))).toBe(true);
  });

  it('does not treat the real whsec_ prefix as a placeholder', () => {
    // A live-looking secret key, so the only thing under test is the webhook
    // secret and not the separate test-key check.
    process.env.STRIPE_SECRET_KEY = STRIPE_LIVE_LOOKING;
    process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_LOOKING;

    const issues = checkPaymentConfig();
    expect(issues.some((issue) => issue.provider === 'stripe')).toBe(false);
  });

  it('flags a missing stripe webhook secret as an error', () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const issues = checkPaymentConfig();
    const stripeIssue = issues.find((issue) => issue.provider === 'stripe');
    expect(stripeIssue?.level).toBe('error');
  });

  it('warns without erroring when a provider is entirely unset', () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const issues = checkPaymentConfig();
    const stripeIssue = issues.find((issue) => issue.provider === 'stripe');
    expect(stripeIssue?.level).toBe('warning');
  });

  it('reports no issues when both providers look real', () => {
    // Live-looking keys and a price for every routed currency, so the config
    // is genuinely clean rather than merely free of placeholder secrets.
    process.env.FLW_SECRET_KEY = FLW_SECRET_LOOKING;
    process.env.STRIPE_SECRET_KEY = STRIPE_LIVE_LOOKING;
    process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_LOOKING;
    for (const code of ['NGN', 'GHS', 'KES', 'ZAR', 'EGP', 'GBP', 'EUR']) {
      process.env[`PRO_ANNUAL_PRICE_${code}`] = '25000';
    }

    expect(checkPaymentConfig()).toHaveLength(0);
  });
});
