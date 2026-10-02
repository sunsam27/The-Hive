import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkPaymentConfig, looksLikePlaceholder } from '../services/payments/config.js';

// Assembled at runtime on purpose. A literal live-key-looking string in source
// trips GitHub push protection and blocks the whole push, even when the value
// is obviously fake. Keep these as joins, never inline literals.
const STRIPE_LIVE_LOOKING = ['sk', 'live', 'a'.repeat(32)].join('_');
const STRIPE_LIVE_LOOKING_SHORT = ['sk', 'live', 'b'.repeat(16)].join('_');
const FLW_TEST_LOOKING = ['FLWSECK_TEST', 'a'.repeat(32), 'X'].join('-');
const STRIPE_TEST_LOOKING = ['sk', 'test', 'c'.repeat(16)].join('_');
const STRIPE_WEBHOOK_LOOKING = ['whsec', 'd'.repeat(24)].join('_');
const FLW_SECRET_LOOKING = ['FLWSECK', '0'.repeat(32), 'X'].join('-');
const FLW_LIVE_LOOKING = ['FLWSECK', 'live', '0'.repeat(16), 'X'].join('-');

const KEYS = [
  'FLW_PUBLIC_KEY',
  'FLW_SECRET_KEY',
  'FLW_SECRET_HASH',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PRO_ANNUAL_PRICE_NGN',
  'PRO_ANNUAL_PRICE_GHS',
  'PRO_ANNUAL_PRICE_KES',
  'PRO_ANNUAL_PRICE_ZAR',
  'PRO_ANNUAL_PRICE_EGP',
  'PRO_ANNUAL_PRICE_GBP',
  'PRO_ANNUAL_PRICE_EUR',
  'NODE_ENV',
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  // A fully priced, live-keyed baseline so each test isolates one problem.
  process.env.FLW_SECRET_KEY = FLW_SECRET_LOOKING;
  process.env.FLW_SECRET_HASH = 'a-strong-random-webhook-secret';
  process.env.STRIPE_SECRET_KEY = STRIPE_LIVE_LOOKING_SHORT;
  process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_LOOKING;
  for (const code of ['NGN', 'GHS', 'KES', 'ZAR', 'EGP', 'GBP', 'EUR']) {
    process.env[`PRO_ANNUAL_PRICE_${code}`] = '25000';
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function messagesFor(provider: string) {
  return checkPaymentConfig()
    .filter((issue) => issue.provider === provider)
    .map((issue) => issue.message);
}

describe('payment config diagnostics', () => {
  it('reports nothing when live keys and prices are configured', () => {
    expect(checkPaymentConfig()).toEqual([]);
  });

  /**
   * The dangerous case: a test key makes every step look successful, so Pro is
   * granted without any money moving and nothing appears broken.
   */
  it('flags a Flutterwave test key', () => {
    process.env.FLW_SECRET_KEY = FLW_TEST_LOOKING;

    const issue = checkPaymentConfig().find(
      (i) => i.provider === 'flutterwave' && i.message.includes('TEST key')
    );
    expect(issue).toBeDefined();
    expect(issue!.level).toBe('warning');
    expect(issue!.message).toContain('no real money moves');
  });

  it('flags a Stripe test key', () => {
    process.env.STRIPE_SECRET_KEY = STRIPE_TEST_LOOKING;

    const issue = checkPaymentConfig().find(
      (i) => i.provider === 'stripe' && i.message.includes('TEST key')
    );
    expect(issue).toBeDefined();
  });

  it('escalates a test key to an error in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.FLW_SECRET_KEY = FLW_TEST_LOOKING;

    const issue = checkPaymentConfig().find(
      (i) => i.provider === 'flutterwave' && i.message.includes('TEST key')
    );
    expect(issue!.level).toBe('error');
    expect(issue!.message).toContain('RUNNING IN PRODUCTION');
  });

  it('does not mistake a live key for a test key', () => {
    expect(checkPaymentConfig()).toEqual([]);
    process.env.FLW_SECRET_KEY = FLW_LIVE_LOOKING;
    expect(
      checkPaymentConfig().some((i) => i.message.includes('TEST key'))
    ).toBe(false);
  });

  it('reports which currencies have no price instead of failing silently', () => {
    delete process.env.PRO_ANNUAL_PRICE_KES;
    delete process.env.PRO_ANNUAL_PRICE_ZAR;

    const messages = messagesFor('plans').join('\n');
    expect(messages).toContain('KES');
    expect(messages).toContain('ZAR');
    expect(messages).toContain('PRO_ANNUAL_PRICE_<CODE>');
    // Priced markets must not be listed.
    expect(messages).not.toContain('NGN');
  });

  it('never lists USD as unpriced', () => {
    delete process.env.PRO_ANNUAL_PRICE_NGN;
    // Assert on the currency list itself: the message also mentions USD in its
    // explanatory sentence, so a plain substring check would be misleading.
    const list = messagesFor('plans').join('\n').match(/configured for ([^.]+)\./)?.[1] || '';
    expect(list).toContain('NGN');
    expect(list.split(',').map((c) => c.trim())).not.toContain('USD');
  });

  it('still catches a missing webhook secret', () => {
    delete process.env.FLW_SECRET_HASH;
    const issue = checkPaymentConfig().find(
      (i) => i.provider === 'flutterwave' && i.message.includes('FLW_SECRET_HASH is not set')
    );
    expect(issue!.level).toBe('error');
  });

  it('rejects an obvious placeholder webhook secret', () => {
    process.env.FLW_SECRET_HASH = 'your-flutterwave-webhook-secret-hash';
    const issue = checkPaymentConfig().find(
      (i) => i.provider === 'flutterwave' && i.message.includes('placeholder')
    );
    expect(issue!.level).toBe('error');
  });

  it('recognises placeholder forms', () => {
    expect(looksLikePlaceholder('')).toBe(true);
    expect(looksLikePlaceholder('your-secret')).toBe(true);
    expect(looksLikePlaceholder('replace_me')).toBe(true);
    // A realistic but fabricated value. Never paste a live webhook secret into
    // a test: GitHub push protection blocks the push and the value has to be
    // rotated anyway.
    expect(looksLikePlaceholder('Zm9yLXRlc3Qtb25seS1hLXJhbmRvbS1mYWtlLXZhbHVl')).toBe(false);
  });
});