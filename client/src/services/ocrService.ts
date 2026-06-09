import api from './api';

export async function processReceipt(file) {
  const formData = new FormData();
  formData.append('receipt', file);
  const { data } = await api.post('/ocr/receipt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
