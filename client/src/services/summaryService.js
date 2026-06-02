import api from './api.js';

export const summaryService = {
  getByWorkspace(workspaceId) {
    return api.get(`/summaries/${workspaceId}`);
  },
};
