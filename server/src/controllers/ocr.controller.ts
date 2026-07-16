import { Request, Response, NextFunction } from 'express';
import { extractReceiptData } from '../services/ocrService.js';

export async function processReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No receipt image provided' });

    if (!process.env.OCR_SPACE_API_KEY) {
      return res.status(503).json({ error: 'OCR service is not configured' });
    }

    const result = await extractReceiptData(req.file.buffer as unknown as ArrayBuffer);

    res.json(result);
  } catch (err: any) {
    if (err.message?.includes('timed out') || err.message?.includes('not configured')) {
      return res.status(408).json({ error: err.message });
    }
    next(err);
  }
}
