import { describe, it, expect, vi, beforeEach } from 'vitest';

const accounts = {
  create: vi.fn(),
  retrieve: vi.fn(),
};

const accountLinks = { create: vi.fn() };

vi.mock('stripe', () => {
  class FakeStripe {
    accounts = accounts;
    accountLinks = accountLinks;
    constructor(
      public key: string,
      public options?: unknown
    ) {}
  }
  return { default: FakeStripe };
});

const queued: any[] = [];

vi.mock('../db/index.js', () => {
  function makeQ() {
    const q: any = (_table?: string) => q;
    q.then = (fn: (value: any) => any) => Promise.resolve(queued.shift()).then(fn);
    q.catch = () => q;
    q.where = () => q;
    q.whereNot = () => q;
    q.whereIn = () => q;
    q.first = () => q;
    q.select = () => q;
    q.insert = () => q;
    q.update = () => q;
    q.del = () => q;
    q.orderBy = () => q;
    q.onConflict = () => q;
    q.merge = () => q;
    q.returning = () => q;
    q.raw = (value: any) => value;
    q.fn = { now: () => 'NOW' };
    return q;
  }
  const kn = (_table: string) => makeQ();
  (kn as any).raw = (value: any) => ({ __raw: value });
  (kn as any).fn = { now: () => 'NOW' };
  return { default: kn };
});

const svc = await import('../services/payments/accounts.js');

const STRIPE_ACCOUNT = {
  id: 'acct_express_1',
  email: 'ada@example.com',
  charges_enabled: true,
  payouts_enabled: true,
  details_submitted: true,
  business_profile: { name: 'Ada Freelance' },
  settings: { dashboard: { display_name: 'Ada' } },
};

function storedStripeAccount() {
  return {
    id: 'pa-1',
    user_id: 'user-1',
    provider: 'stripe',
    provider_account_id: 'acct_express_1',
    status: 'active',
    details_submitted: true,
    charges_enabled: true,
    payouts_enabled: true,
    business_name: 'Ada Freelance',
    display_label: 'Ada',
    meta: { email: 'ada@example.com' },
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  };
}

function reset() {
  vi.clearAllMocks();
  queued.length = 0;
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.FLW_SECRET_KEY = 'FLWSECK-test';
  process.env.PLATFORM_FEE_RATE = '0.02';
  delete process.env.PLATFORM_FEE_MIN;
}

beforeEach(reset);

describe('split eligibility', () => {
  it('accepts an active account that can pay out', () => {
    expect(
      svc.isAccountEligibleForSplits({
        status: 'active',
        payouts_enabled: true,
        provider_account_id: 'acct_1',
      })
    ).toBe(true);
  });

  it('rejects accounts that are not active, cannot pay out, or have no id', () => {
    expect(
      svc.isAccountEligibleForSplits({ status: 'pending', payouts_enabled: false, provider_account_id: 'acct_1' })
    ).toBe(false);
    expect(
      svc.isAccountEligibleForSplits({ status: 'restricted', payouts_enabled: true, provider_account_id: 'acct_1' })
    ).toBe(false);
    expect(
      svc.isAccountEligibleForSplits({ status: 'active', payouts_enabled: false, provider_account_id: 'acct_1' })
    ).toBe(false);
    expect(
      svc.isAccountEligibleForSplits({ status: 'active', payouts_enabled: true, provider_account_id: '' })
    ).toBe(false);
    expect(svc.isAccountEligibleForSplits(null)).toBe(false);
    expect(svc.isAccountEligibleForSplits(undefined)).toBe(false);
  });
});

describe('stripe onboarding', () => {
  it('creates an express account and returns an onboarding link', async () => {
    queued.push(undefined);
    queued.push([storedStripeAccount()]);
    accounts.create.mockResolvedValue(STRIPE_ACCOUNT);
    accountLinks.create.mockResolvedValue({ url: 'https://connect.stripe.com/setup/e/abc' });

    const result = await svc.createStripeOnboarding('user-1', {
      email: 'ada@example.com',
      returnUrl: 'https://app.example.com/settings/payouts?stripe_onboarding=return',
      refreshUrl: 'https://app.example.com/settings/payouts?stripe_onboarding=refresh',
    });

    expect(accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'express',
        email: 'ada@example.com',
        capabilities: { transfers: { requested: true } },
      }),
      expect.objectContaining({ idempotencyKey: 'connect-express-account-user-1' })
    );

    expect(accountLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'acct_express_1',
        type: 'account_onboarding',
        return_url: 'https://app.example.com/settings/payouts?stripe_onboarding=return',
        refresh_url: 'https://app.example.com/settings/payouts?stripe_onboarding=refresh',
      })
    );

    expect(result.onboardingUrl).toBe('https://connect.stripe.com/setup/e/abc');
    expect(result.status).toBe('active');
    expect(result.canReceiveSplits).toBe(true);
  });

  it('reuses an existing account instead of creating a second one', async () => {
    queued.push({ ...storedStripeAccount() });
    queued.push([storedStripeAccount()]);
    accounts.retrieve.mockResolvedValue(STRIPE_ACCOUNT);
    accountLinks.create.mockResolvedValue({ url: 'https://connect.stripe.com/setup/e/abc' });

    await svc.createStripeOnboarding('user-1', {
      email: 'ada@example.com',
      returnUrl: 'https://app.example.com/ret',
      refreshUrl: 'https://app.example.com/ref',
    });

    expect(accounts.retrieve).toHaveBeenCalledWith('acct_express_1');
    expect(accounts.create).not.toHaveBeenCalled();
  });

  it('surfaces a missing stripe key as a configuration error', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    await expect(
      svc.createStripeOnboarding('user-1', {
        email: 'a@b.com',
        returnUrl: 'https://app.example.com/ret',
        refreshUrl: 'https://app.example.com/ref',
      })
    ).rejects.toThrow(/Stripe not configured/);
  });
});

describe('flutterwave subaccounts', () => {
  it('stores the subaccount id and only the last four digits', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        status: 'success',
        message: 'Subaccount created',
        data: {
          subaccount_id: 'RS_235E8F4E92A4048B57EA29B0E1B8F78B',
          account_number: '0690000037',
          account_bank: '044',
          bank_name: 'ACCESS BANK NIGERIA',
          split_type: 'percentage',
          split_value: 0.02,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    queued.push(undefined);
    queued.push([
      {
        id: 'pa-2',
        user_id: 'user-1',
        provider: 'flutterwave',
        provider_account_id: 'RS_235E8F4E92A4048B57EA29B0E1B8F78B',
        status: 'active',
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        business_name: 'Ada Freelance',
        display_label: 'ACCESS BANK NIGERIA ending 0037',
        meta: { account_last4: '0037' },
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
      },
    ]);

    const result = await svc.createFlutterwaveSubaccount('user-1', {
      accountBank: '044',
      accountNumber: '0690000037',
      businessName: 'Ada Freelance',
      country: 'NG',
      businessMobile: '08000010100',
    });

    const [, args] = fetchMock.mock.calls[0] as any;
    const body = JSON.parse(args.body);
    expect(body.split_type).toBe('percentage');
    expect(body.split_value).toBe(0.02);
    expect(body.country).toBe('NG');

    expect(result.status).toBe('active');
    expect(result.canReceiveSplits).toBe(true);
    expect(result.lastFour).toBe('0037');
    expect(result.displayLabel).toBe('ACCESS BANK NIGERIA ending 0037');
    expect(JSON.stringify(result)).not.toContain('0690000037');
  });

  it('refuses to create a second subaccount', async () => {
    queued.push({ provider_account_id: 'RS_existing' });
    await expect(
      svc.createFlutterwaveSubaccount('user-1', {
        accountBank: '044',
        accountNumber: '0690000037',
        businessName: 'Ada',
        country: 'NG',
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('explains a duplicate bank account from flutterwave', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({
          status: 'error',
          message: 'A subaccount with the account number and bank already exists',
          data: null,
        }),
      })
    );
    queued.push(undefined);

    await expect(
      svc.createFlutterwaveSubaccount('user-1', {
        accountBank: '044',
        accountNumber: '0690000037',
        businessName: 'Ada',
        country: 'NG',
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('validates the account number before calling flutterwave', async () => {
    await expect(
      svc.createFlutterwaveSubaccount('user-1', {
        accountBank: '044',
        accountNumber: '   ',
        businessName: 'Ada',
        country: 'NG',
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('unlink', () => {
  it('reports whether a row was removed', async () => {
    queued.push(1);
    await expect(svc.unlinkAccount('user-1', 'stripe')).resolves.toBe(true);

    queued.push(0);
    await expect(svc.unlinkAccount('user-1', 'stripe')).resolves.toBe(false);
  });

  it('rejects unknown providers', async () => {
    await expect(svc.unlinkAccount('user-1', 'paypal')).rejects.toMatchObject({ status: 400 });
  });
});
