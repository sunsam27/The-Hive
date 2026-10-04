import { useEffect, useState } from 'react';
import { paymentService } from '../services/paymentService';
import { CURRENCY_META } from '../constants/currencies';

const FALLBACK_OPTIONS = Object.keys(CURRENCY_META).map((code) => ({
  code,
  available: ['NGN', 'GHS', 'KES', 'ZAR', 'EGP'].includes(code),
  provider: ['NGN', 'GHS', 'KES', 'ZAR', 'EGP'].includes(code) ? 'flutterwave' : 'stripe',
  group: ['NGN', 'GHS', 'KES', 'ZAR', 'EGP'].includes(code) ? 'africa' : 'international',
}));

/**
 * Loads the server's payment currency capabilities.
 *
 * The fallback assumes only Flutterwave is configured, which is the safe
 * assumption: it hides currencies that would fail with a 503 rather than
 * offering them. Once /payments/capabilities responds, real values replace it
 * and the list updates without any code change.
 */
export function useCurrencies() {
  const [options, setOptions] = useState(FALLBACK_OPTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    paymentService
      .capabilities()
      .then((res) => {
        if (!active) return;
        const currencies = res?.data?.currencies;
        if (Array.isArray(currencies) && currencies.length > 0) {
          setOptions(currencies);
        }
      })
      .catch(() => {
        if (active) setOptions(FALLBACK_OPTIONS);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { options, loading };
}