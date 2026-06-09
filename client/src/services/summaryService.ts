import api from './api';

export const summaryService = {
  getByWorkspace(workspaceId) {
    return api.get(`/summaries/${workspaceId}`);
  },
};
