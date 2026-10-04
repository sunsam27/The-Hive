import api from './api';

export const paymentService = {
  /**
   * Every currency our providers support, flagged with whether its provider is
   * configured. Cached in the module because it only changes when an
   * environment variable does.
   */
  _capabilities: null as Promise<{ currencies: any[] }> | null,

  capabilities() {
    if (!this._capabilities) {
      this._capabilities = api.get('/payments/capabilities').catch((err) => {
        // Do not cache a failure, otherwise one bad response sticks for the
        // whole session and the dropdown stays empty.
        this._capabilities = null;
        throw err;
      });
    }
    return this._capabilities;
  },

  initiate(expenseId) {
    return api.post('/payments/initiate', { expenseId });
  },

  verify(txRef) {
    return api.get(`/payments/verify/${txRef}`);
  },

  listAccounts() {
    return api.get('/payments/accounts');
  },

  startStripeOnboarding() {
    return api.post('/payments/accounts/stripe/onboard', {});
  },

  syncStripeAccount() {
    return api.post('/payments/accounts/stripe/sync', {});
  },

  addFlutterwaveSubaccount(payload) {
    return api.post('/payments/accounts/flutterwave', payload);
  },

  removeAccount(provider) {
    return api.delete(`/payments/accounts/${provider}`);
  },
};
