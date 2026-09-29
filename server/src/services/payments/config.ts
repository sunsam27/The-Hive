import { allProviders } from './registry.js';

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
  }

  return issues;
}
