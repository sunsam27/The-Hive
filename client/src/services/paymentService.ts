import api from './api';

export const paymentService = {
  initiate(expenseId) {
    return api.post('/payments/initiate', { expenseId });
  },

  verify(txRef) {
    return api.get(`/payments/verify/${txRef}`);
  },
};
