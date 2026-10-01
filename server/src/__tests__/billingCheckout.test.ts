import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

type Q = { then: (fn: (value: any) => any) => Promise<any>; catch: (fn: (reason: any) => any) => Promise<any>; [key: string]: any };

vi.mock('../db/index.js', () => {
  function makeQ(queue: any[] = []): Q {
    const q: Q = (_table?: string) => q;
    q._queue = queue;
    q.then = (fn: (value: any) => any) => Promise.resolve(queue.shift()).then(fn);
    q.catch = (fn: (reason: any) => any) => Promise.resolve(undefined).catch(fn);
    q.where = () => q;
    q.whereIn = () => q;
    q.first = vi.fn(() => q);
    q.select = () => q;
    q.insert = () => q;
    q.update = () => q;
    q.del = () => q;
    q.returning = vi.fn(() => q);
    q.count = vi.fn(() => q);
    q.onConflict = vi.fn(() => q);
    q.merge = vi.fn(() => q);
    return q;
  }

  const mainQueue: any[] = [];
  const trxQueue: any[] = [];
  const q = makeQ(mainQueue);
  const trx = makeQ(trxQueue);

  const kn = (_table: string) => q;
  kn.transaction = vi.fn().mockImplementation(async (cb: (t: Q) => void) => cb(trx));
  kn._reset = () => { mainQueue.length = 0; trxQueue.length = 0; };
  kn._push = (v: any) => mainQueue.push(v);
  kn._trxPush = (v: any) => trxQueue.push(v);
  kn._queries = () => mainQueue;

  return { default: kn };
});

vi.mock('../utils/accessControl.js', () => ({
  checkWorkspaceAccess: vi.fn().mockResolvedValue(true),
  checkExpenseAccess: vi.fn(),
  checkReviewerRole: vi.fn(),
}));

const { default: app } = await import('../app.js');
const db = (await import('../db/index.js')).default;
const accessControl = await import('../utils/accessControl.js');

const kn = db as any;
const token = jwt.sign({ userId: 'owner-1' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
const authHeader = { Authorization: `Bearer ${token}` };

const workspace = {
  id: 'ws-1', name: 'Test', owner_id: 'owner-1', plan: 'free', paid_until: null,
};
const user = { id: 'owner-1', name: 'Ada', email: 'ada@example.com' };
const checkoutUrl = 'https://checkout.example/session/abc';

beforeEach(() => {
  vi.clearAllMocks();
  kn._reset();
  delete process.env.PRO_ANNUAL_PRICE_USD;
  delete process.env.PRO_ANNUAL_PRICE_NGN;
  // An unconfigured currency is rejected rather than charged the numeric USD
  // amount, so these tests must supply a real local price.
  process.env.PRO_ANNUAL_PRICE_NGN = '60000';
  process.env.FLW_PUBLIC_KEY = 'FLWPUBK-test';
  process.env.FLW_SECRET_KEY = 'FLWSECK-test';
  vi.stubGlobal('fetch', vi.fn());
});

describe('POST /api/billing/checkout', () => {
  function seedHappyPath() {
    kn._push(workspace);
    kn._push(user);
    kn._push([{ id: 'purchase-1' }]);
    kn._push(undefined);
  }

  it('creates a checkout and charges exactly the plan price', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'success', data: { link: checkoutUrl, id: 77 } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    seedHappyPath();

    const res = await request(app)
      .post('/api/billing/checkout')
      .set(authHeader)
      .send({ workspaceId: 'ws-1', currency: 'NGN' });

    expect(res.status).toBe(200);
    expect(res.body.paymentUrl).toBe(checkoutUrl);
    expect(res.body.amount).toBe(60000);
    expect(res.body.netAmount).toBe(60000);
    expect(res.body.platformFee).toBe(0);
    expect(res.body.grossAmount).toBe(60000);
  });

  it('never splits a plan purchase to a connected account', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'success', data: { link: checkoutUrl, id: 77 } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    seedHappyPath();

    await request(app)
      .post('/api/billing/checkout')
      .set(authHeader)
      .send({ workspaceId: 'ws-1', currency: 'NGN' });

    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body as string);
    expect(body.subaccounts).toBeUndefined();
    expect(body.amount).toBe(60000);
  });

  it('generates a plan-scoped reference rather than an expense reference', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'success', data: { link: checkoutUrl, id: 77 } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    seedHappyPath();

    const res = await request(app)
      .post('/api/billing/checkout')
      .set(authHeader)
      .send({ workspaceId: 'ws-1', currency: 'NGN' });

    expect(res.body.reference).toMatch(/^FINSYTE-PRO-/);
  });

  it('refuses an unroutable currency before contacting a provider', async () => {
    kn._push(workspace);

    const res = await request(app)
      .post('/api/billing/checkout')
      .set(authHeader)
      .send({ workspaceId: 'ws-1', currency: 'XYZ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('XYZ');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses a currency with no configured price instead of charging the USD number', async () => {
    // Guards against charging someone "39 NGN": without an explicit local
    // price the checkout must fail rather than reuse the USD amount.
    delete process.env.PRO_ANNUAL_PRICE_NGN;
    kn._push(workspace);
    kn._push(user);

    const res = await request(app)
      .post('/api/billing/checkout')
      .set(authHeader)
      .send({ workspaceId: 'ws-1', currency: 'NGN' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('PRO_ANNUAL_PRICE_NGN');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('prices a configured local currency correctly', async () => {
    process.env.PRO_ANNUAL_PRICE_NGN = '60000';
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'success', data: { link: checkoutUrl, id: 77 } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    seedHappyPath();

    const res = await request(app)
      .post('/api/billing/checkout')
      .set(authHeader)
      .send({ workspaceId: 'ws-1', currency: 'NGN' });

    expect(res.status).toBe(200);
    expect(res.body.netAmount).toBe(60000);
  });

  it('only lets the workspace owner buy the plan', async () => {
    kn._push({ ...workspace, owner_id: 'someone-else' });

    const res = await request(app)
      .post('/api/billing/checkout')
      .set(authHeader)
      .send({ workspaceId: 'ws-1' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('owner');
  });

  it('rejects a non-member of the workspace', async () => {
    kn._push(workspace);
    vi.mocked(accessControl.checkWorkspaceAccess).mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/billing/checkout')
      .set(authHeader)
      .send({ workspaceId: 'ws-1' });

    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown workspace', async () => {
    kn._push(undefined);

    const res = await request(app)
      .post('/api/billing/checkout')
      .set(authHeader)
      .send({ workspaceId: 'nope' });

    expect(res.status).toBe(404);
  });

  it('requires a workspaceId', async () => {
    const res = await request(app).post('/api/billing/checkout').set(authHeader).send({});
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/billing/checkout').send({ workspaceId: 'ws-1' });
    expect(res.status).toBe(401);
  });

  it('rejects a non-positive configured price', async () => {
    process.env.PRO_ANNUAL_PRICE_NGN = '0';
    kn._push(workspace);

    const res = await request(app)
      .post('/api/billing/checkout')
      .set(authHeader)
      .send({ workspaceId: 'ws-1', currency: 'NGN' });

    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns 503 when the provider is not configured', async () => {
    delete process.env.FLW_PUBLIC_KEY;
    delete process.env.FLW_SECRET_KEY;
    kn._push(workspace);
    kn._push(user);

    const res = await request(app)
      .post('/api/billing/checkout')
      .set(authHeader)
      .send({ workspaceId: 'ws-1', currency: 'NGN' });

    expect(res.status).toBe(503);
  });
});

describe('plan reference routing', () => {
  it('recognises only PRO-namespaced references as plan purchases', async () => {
    const { isPlanReference, generatePlanReference, generatePaymentReference } =
      await import('../services/payments/reference.js');

    expect(isPlanReference(generatePlanReference('ws-1'))).toBe(true);
    expect(isPlanReference(generatePaymentReference('exp-1'))).toBe(false);
    expect(isPlanReference(null)).toBe(false);
  });

  it('never lets an expense reference be read as a plan purchase', async () => {
    const res = await request(app)
      .get('/api/billing/checkout/FINSYTE-exp-1-123-ABCDEF')
      .set(authHeader);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/billing/plans', () => {
  it('advertises free and pro with the fee reduction', async () => {
    const res = await request(app).get('/api/billing/plans');

    expect(res.status).toBe(200);
    expect(res.body.plans).toHaveLength(2);

    const free = res.body.plans.find((p: any) => p.name === 'free');
    const pro = res.body.plans.find((p: any) => p.name === 'pro');

    expect(feeRateOf(free)).toBe(0.02);
    expect(feeRateOf(pro)).toBe(0.008);
    expect(pro.priceUsd).toBe(39);
    expect(pro.billingPeriodMonths).toBe(12);
  });

  it('does not require authentication to see pricing', async () => {
    const res = await request(app).get('/api/billing/plans');
    expect(res.status).toBe(200);
  });
});

function feeRateOf(plan: any) {
  return plan.feeRate;
}
