/**
 * Currency metadata.
 *
 * `CURRENCY_META` covers exactly the currencies our two payment providers
 * accept: the union of Flutterwave's and Stripe's supported lists. Anything not
 * in here cannot be charged, so it is deliberately absent rather than listed and
 * left to fail at checkout.
 *
 * Names and symbols are plain ASCII. The previous flag-emoji approach rendered
 * as replacement characters on Windows and on files without UTF-8, so the
 * dropdown uses the ISO code and symbol instead.
 */
export const CURRENCY_META = {
  // Flutterwave (Africa)
  NGN: { name: 'Nigerian Naira', symbol: '₦' },
  GHS: { name: 'Ghanaian Cedi', symbol: 'GH₵' },
  ZAR: { name: 'South African Rand', symbol: 'R' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh' },
  EGP: { name: 'Egyptian Pound', symbol: 'E£' },
  RWF: { name: 'Rwandan Franc', symbol: 'FRw' },
  XOF: { name: 'West African CFA Franc', symbol: 'CFA' },
  XAF: { name: 'Central African CFA Franc', symbol: 'FCFA' },
  ZMW: { name: 'Zambian Kwacha', symbol: 'ZK' },
  UGX: { name: 'Ugandan Shilling', symbol: 'USh' },
  TZS: { name: 'Tanzanian Shilling', symbol: 'TSh' },
  MZN: { name: 'Mozambican Metical', symbol: 'MT' },
  GMD: { name: 'Gambian Dalasi', symbol: 'GMD' },
  MWK: { name: 'Malawian Kwacha', symbol: 'MK' },
  MUR: { name: 'Mauritian Rupee', symbol: '₨' },
  GNF: { name: 'Guinean Franc', symbol: 'FG' },
  SOS: { name: 'Somali Shilling', symbol: 'Sh.So.' },
  ZWL: { name: 'Zimbabwean Dollar', symbol: 'Z$' },
  SLL: { name: 'Sierra Leonean Leone', symbol: 'Le' },

  // Stripe (international)
  USD: { name: 'US Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'British Pound', symbol: '£' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF' },
  SEK: { name: 'Swedish Krona', symbol: 'kr' },
  NOK: { name: 'Norwegian Krone', symbol: 'kr' },
  DKK: { name: 'Danish Krone', symbol: 'kr' },
  PLN: { name: 'Polish Zloty', symbol: 'zł' },
  CZK: { name: 'Czech Koruna', symbol: 'Kč' },
  HUF: { name: 'Hungarian Forint', symbol: 'Ft' },
  RON: { name: 'Romanian Leu', symbol: 'lei' },
  BGN: { name: 'Bulgarian Lev', symbol: 'лв' },
  HRK: { name: 'Croatian Kuna', symbol: 'kn' },
  ISK: { name: 'Icelandic Krona', symbol: 'kr' },
  RUB: { name: 'Russian Ruble', symbol: '₽' },
  TRY: { name: 'Turkish Lira', symbol: '₺' },
  UAH: { name: 'Ukrainian Hryvnia', symbol: '₴' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$' },
  AUD: { name: 'Australian Dollar', symbol: 'A$' },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$' },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$' },
  JPY: { name: 'Japanese Yen', symbol: '¥' },
  CNY: { name: 'Chinese Yuan', symbol: '¥' },
  INR: { name: 'Indian Rupee', symbol: '₹' },
  KRW: { name: 'South Korean Won', symbol: '₩' },
  TWD: { name: 'New Taiwan Dollar', symbol: 'NT$' },
  THB: { name: 'Thai Baht', symbol: '฿' },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM' },
  PHP: { name: 'Philippine Peso', symbol: '₱' },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp' },
  VND: { name: 'Vietnamese Dong', symbol: '₫' },
  AED: { name: 'UAE Dirham', symbol: 'د.إ' },
  SAR: { name: 'Saudi Riyal', symbol: '﷼' },
  QAR: { name: 'Qatari Riyal', symbol: '﷼' },
  ILS: { name: 'Israeli Shekel', symbol: '₪' },
  MAD: { name: 'Moroccan Dirham', symbol: 'MAD' },
  TND: { name: 'Tunisian Dinar', symbol: 'د.ت' },
  BRL: { name: 'Brazilian Real', symbol: 'R$' },
  MXN: { name: 'Mexican Peso', symbol: 'MX$' },
  ARS: { name: 'Argentine Peso', symbol: 'AR$' },
  CLP: { name: 'Chilean Peso', symbol: 'CLP$' },
  COP: { name: 'Colombian Peso', symbol: 'CO$' },
  PEN: { name: 'Peruvian Sol', symbol: 'S/' },
} as const;

export type CurrencyCode = keyof typeof CURRENCY_META;

/**
 * Legacy list kept for the invoice form, which is not a payment flow. Prefer
 * CURRENCY_META for anything that touches checkout.
 */
export const CURRENCIES = (
  Object.keys(CURRENCY_META) as CurrencyCode[]
).map((code) => ({ code, ...CURRENCY_META[code] }));

export function currencyMeta(code) {
  return CURRENCY_META[String(code || '').toUpperCase()];
}

export function formatCurrency(amount, currencyCode = 'USD') {
  const formatted = (Number(amount) || 0).toFixed(2);
  const meta = currencyMeta(currencyCode);
  // Unknown codes render as "NGN 1,234.00" rather than borrowing another
  // currency's symbol, which used to silently show dollars for naira.
  return meta ? `${meta.symbol}${formatted}` : `${String(currencyCode || '').toUpperCase()} ${formatted}`;
}

/**
 * Currencies offered when buying a plan. The Pro purchase is a one-time charge,
 * so it can be paid through either provider, and the African currencies are
 * listed first because Flutterwave is the route that works without a card on
 * file.
 */
export const PLAN_CURRENCIES = [
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'EUR', name: 'Euro' },
];