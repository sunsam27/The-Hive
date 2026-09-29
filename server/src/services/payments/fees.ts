export interface FeeBreakdown {
  netAmount: number;
  platformFee: number;
  grossAmount: number;
  rate: number;
  minimum: number;
}

export interface FeeOptions {
  rate?: number;
  minimum?: number;
  currency?: string;
}

const DEFAULT_RATE = 0.02;
const DEFAULT_MINIMUM = 1;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function feeRate(): number {
  return parseNumber(process.env.PLATFORM_FEE_RATE, DEFAULT_RATE);
}

export function feeMinimum(currency: string = 'USD'): number {
  const normalized = String(currency || 'USD').toUpperCase();
  const specific = process.env[`PLATFORM_FEE_MIN_${normalized}`];
  if (specific !== undefined) return parseNumber(specific, DEFAULT_MINIMUM);
  return parseNumber(process.env.PLATFORM_FEE_MIN, DEFAULT_MINIMUM);
}

export function calculateFee(netAmount: number, options: FeeOptions = {}): FeeBreakdown {
  const currency = options.currency ?? 'USD';
  const rate = options.rate ?? feeRate();
  const minimum = options.minimum ?? feeMinimum(currency);

  const base = round2(Number(netAmount));
  const fee = round2(Math.max(base * rate, minimum));

  return {
    netAmount: base,
    platformFee: fee,
    grossAmount: round2(base + fee),
    rate,
    minimum,
  };
}
