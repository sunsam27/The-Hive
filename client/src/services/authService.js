import api from './api.js';

export const authService = {
  login(email, password) {
    return api.post('/auth/login', { email, password });
  },

  signup(name, email, password, role) {
    return api.post('/auth/signup', { name, email, password, role });
  },

  getMe() {
    return api.get('/auth/me');
  },

  verifyEmail(token) {
    return api.get(`/auth/verify/${token}`);
  },

  forgotPassword(email) {
    return api.post('/auth/forgot-password', { email });
  },

  resetPassword(token, password) {
    return api.post(`/auth/reset-password/${token}`, { password });
  },

  changePassword(currentPassword, newPassword) {
    return api.put('/auth/change-password', { currentPassword, newPassword });
  },

  updateProfile(data) {
    return api.patch('/auth/profile', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
