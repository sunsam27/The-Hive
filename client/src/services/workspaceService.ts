import api from './api';

export const workspaceService = {
  list() {
    return api.get('/workspaces');
  },

  getById(id) {
    return api.get(`/workspaces/${id}`);
  },

  create(data) {
    return api.post('/workspaces', data);
  },

  addMember(workspaceId, email, role) {
    return api.post(`/workspaces/${workspaceId}/members`, { email, role });
  },

  updateWorkspace(id, data) {
    return api.patch(`/workspaces/${id}`, data);
  },

  removeMember(workspaceId, userId) {
    return api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },

  updateMemberRole(workspaceId, userId, role) {
    return api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role });
  },

  deleteWorkspace(id) {
    return api.delete(`/workspaces/${id}`);
  },
};
