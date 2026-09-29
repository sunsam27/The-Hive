import api from './api';

export const paymentService = {
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
