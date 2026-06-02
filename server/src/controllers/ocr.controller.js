import { extractReceiptData } from '../services/ocrService.js';

export async function processReceipt(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No receipt image provided' });

    const result = await extractReceiptData(req.file.buffer);

    res.json(result);
  } catch (err) {
    next(err);
  }
}
