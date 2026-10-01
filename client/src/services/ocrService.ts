import api from './api';

export async function processReceipt(file, workspaceId) {
  if (!workspaceId) throw new Error('workspaceId is required to scan a receipt');
  const formData = new FormData();
  formData.append('receipt', file);
  formData.append('workspaceId', workspaceId);
  const { data } = await api.post('/ocr/receipt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 55000,
  });
  return data;
}
