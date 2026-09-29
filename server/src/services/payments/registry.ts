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
