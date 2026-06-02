import api from './api.js';

export const expenseService = {
  list(params) {
    return api.get('/expenses', { params });
  },

  getById(id) {
    return api.get(`/expenses/${id}`);
  },

  create(data) {
    return api.post('/expenses', data);
  },

  update(id, data) {
    return api.patch(`/expenses/${id}`, data);
  },

  submit(id) {
    return api.post(`/expenses/${id}/submit`);
  },

  review(id, status, notes) {
    return api.patch(`/expenses/${id}/review`, { status, notes });
  },

  uploadReceipt(id, file, ocrRawText) {
    const formData = new FormData();
    formData.append('receipt', file);
    if (ocrRawText) formData.append('ocr_raw_text', ocrRawText);
    return api.post(`/expenses/${id}/receipts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  addTag(id, name) {
    return api.post(`/expenses/${id}/tags`, { name });
  },

  removeTag(id, name) {
    return api.delete(`/expenses/${id}/tags/${encodeURIComponent(name)}`);
  },

  deleteExpense(id) {
    return api.delete(`/expenses/${id}`);
  },

  pay(id) {
    return api.post(`/expenses/${id}/pay`);
  },

  submitAllDrafts() {
    return api.post('/expenses/submit-all-drafts');
  },

  exportCsv(params) {
    return api.get('/expenses/export/csv', { params, responseType: 'blob' });
  },
};
