import { flutterwaveProvider } from './flutterwave.provider.js';
import { stripeProvider } from './stripe.provider.js';
import type { PaymentProvider } from './types.js';

const providers: readonly PaymentProvider[] = [flutterwaveProvider, stripeProvider];

const providersByName = new Map(providers.map((provider) => [provider.name, provider]));

const AFRICAN_CURRENCIES = new Set([
  'NGN', 'GHS', 'ZAR', 'KES', 'EGP', 'RWF', 'XOF', 'XAF', 'ZMW', 'UGX',
  'TZS', 'MZN', 'GMD', 'MWK', 'MUR', 'GNF', 'SOS', 'ZWL', 'SLL', 'SDG', 'ETB',
]);

export class PaymentProviderUnavailableError extends Error {
  readonly currency: string;

  constructor(currency: string) {
    super(`No payment provider is configured for ${currency}`);
    this.name = 'PaymentProviderUnavailableError';
    this.currency = currency;
  }
}

export function getProvider(name: string): PaymentProvider | null {
  return providersByName.get(String(name || '').toLowerCase()) ?? null;
}

export function allProviders(): readonly PaymentProvider[] {
  return providers;
}

function defaultProviderName(): string {
  const configured = String(process.env.PLATFORM_DEFAULT_PROVIDER || '').toLowerCase();
  if (configured && providersByName.has(configured)) return configured;
  return 'stripe';
}

export function resolveProvider(currency: string): PaymentProvider {
  const normalized = String(currency || 'USD').toUpperCase();

  const preferredName = AFRICAN_CURRENCIES.has(normalized) ? 'flutterwave' : defaultProviderName();
  const preferred = getProvider(preferredName);
  if (preferred?.supportsCurrency(normalized)) return preferred;

  const fallback = providers.find((candidate) => candidate.supportsCurrency(normalized));
  if (!fallback) throw new PaymentProviderUnavailableError(normalized);
  return fallback;
}

export function listConfiguredProviders(): PaymentProvider[] {
  return providers.filter((provider) => provider.isConfigured());
}

export interface CurrencyCapability {
  code: string;
  provider: string | null;
  available: boolean;
  group: 'africa' | 'international';
}

export function isAfricanCurrency(currency: string): boolean {
  return AFRICAN_CURRENCIES.has(String(currency || '').toUpperCase());
}

/**
 * Every currency either provider claims, paired with the provider that will
 * actually handle it and whether that provider is configured.
 *
 * The provider is resolved through resolveProvider rather than inferred from
 * list order, so this can never disagree with what checkout does at runtime.
 * The client uses it to offer currency selection without letting anyone pick a
 * currency that will fail with a 503.
 */
export function currencyCapabilities(): CurrencyCapability[] {
  const codes = new Set<string>();
  for (const provider of providers) {
    for (const code of provider.routedCurrencies) codes.add(code);
  }

  return [...codes]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => {
      let providerName: string | null = null;
      let available = false;

      try {
        const provider = resolveProvider(code);
        providerName = provider.name;
        available = provider.isConfigured();
      } catch {
        // No provider claims this currency at all.
      }

      return { code, provider: providerName, available, group: isAfricanCurrency(code) ? 'africa' as const : 'international' as const };
    });
}
