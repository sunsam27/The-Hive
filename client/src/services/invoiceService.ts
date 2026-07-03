import api from './api';

export const invoiceService = {
  list(params) {
    return api.get('/invoices', { params });
  },

  getById(id) {
    return api.get(`/invoices/${id}`);
  },

  create(data) {
    return api.post('/invoices', data);
  },

  update(id, data) {
    return api.patch(`/invoices/${id}`, data);
  },

  delete(id) {
    return api.delete(`/invoices/${id}`);
  },

  convertToExpense(id) {
    return api.post(`/invoices/${id}/convert`);
  },

  downloadPdf(id) {
    return api.get(`/invoices/${id}/download`, { responseType: 'blob' });
  },
};
