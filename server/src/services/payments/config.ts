import { allProviders } from './registry.js';
import { PLAN_CURRENCY_CODES, proAnnualPrice } from '../../config/plans.js';

export interface PaymentConfigIssue {
  level: 'error' | 'warning';
  provider: string;
  message: string;
}

const ENV_VARS: Record<string, { secretKey: string; webhookSecret: string }> = {
  flutterwave: { secretKey: 'FLW_SECRET_KEY', webhookSecret: 'FLW_SECRET_HASH' },
  stripe: { secretKey: 'STRIPE_SECRET_KEY', webhookSecret: 'STRIPE_WEBHOOK_SECRET' },
};

const PLACEHOLDER_PREFIXES = [
  'your-',
  'your_',
  'change-me',
  'change_me',
  'replace',
  'placeholder',
  'example',
  'dummy',
  'xxx',
  'abc123',
];

export function looksLikePlaceholder(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return true;
  return PLACEHOLDER_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

export function webhookSecretVar(providerName: string): string {
  return ENV_VARS[providerName]?.webhookSecret ?? `${providerName.toUpperCase()}_WEBHOOK_SECRET`;
}

/**
 * Test-mode keys never move real money, but everything else in the flow looks
 * like it worked. Left in production a customer can "pay" and be granted Pro for
 * free, which is far worse than a hard failure because nothing looks broken.
 */
function looksLikeTestKey(value: string): boolean {
  const trimmed = value.trim();
  return /_TEST[-_]/i.test(trimmed) || /^(sk|pk|rk)_test_/i.test(trimmed);
}

export function checkPaymentConfig(): PaymentConfigIssue[] {
  const issues: PaymentConfigIssue[] = [];

  for (const provider of allProviders()) {
    const vars = ENV_VARS[provider.name];
    if (!vars) continue;

    const secretKey = process.env[vars.secretKey];
    const webhookSecret = process.env[vars.webhookSecret];

    if (!secretKey && !webhookSecret) {
      issues.push({
        level: 'warning',
        provider: provider.name,
        message:
          `${provider.name} is not configured (${vars.secretKey} / ${vars.webhookSecret} unset). ` +
          `Payments in currencies routed to it will be rejected.`,
      });
      continue;
    }

    if (!secretKey) {
      issues.push({
        level: 'error',
        provider: provider.name,
        message: `${vars.webhookSecret} is set but ${vars.secretKey} is missing, so ${provider.name} cannot charge payments.`,
      });
    }

    if (!webhookSecret) {
      issues.push({
        level: 'error',
        provider: provider.name,
        message:
          `${vars.webhookSecret} is not set, so every ${provider.name} webhook will be rejected with 401. ` +
          `Copy the signing secret from the ${provider.name} dashboard.`,
      });
    } else if (looksLikePlaceholder(webhookSecret)) {
      issues.push({
        level: 'error',
        provider: provider.name,
        message:
          `${vars.webhookSecret} looks like a placeholder, so ${provider.name} webhooks will fail signature ` +
          `verification and payments will never be confirmed.`,
      });
    }

    if (secretKey && looksLikeTestKey(secretKey)) {
      issues.push({
        level: process.env.NODE_ENV === 'production' ? 'error' : 'warning',
        provider: provider.name,
        message:
          `${vars.secretKey} is a TEST key. ${provider.name} will complete checkouts and fire webhooks but ` +
          `no real money moves, so Pro would be granted without payment. ` +
          `Swap in live keys before taking payments.` +
          (process.env.NODE_ENV === 'production' ? ' THIS IS RUNNING IN PRODUCTION.' : ''),
      });
    }
  }

  // A currency with no configured price fails closed at checkout, which is safe
  // but reads as a random 400 to the customer. Surface it at boot instead.
  const unpriced = PLAN_CURRENCY_CODES.filter(
    (code) => code !== 'USD' && proAnnualPrice(code) === null
  );
  if (unpriced.length > 0) {
    issues.push({
      level: 'warning',
      provider: 'plans',
      message:
        `No Pro price configured for ${unpriced.join(', ')}. Checkout rejects these with a 400 rather ` +
        `than charging the USD amount. Set PRO_ANNUAL_PRICE_<CODE> to open those markets.`,
    });
  }

  return issues;
}
