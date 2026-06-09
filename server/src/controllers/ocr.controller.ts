import { Request, Response, NextFunction } from 'express';
import { extractReceiptData } from '../services/ocrService.js';

export async function processReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No receipt image provided' });

    const result = await extractReceiptData(req.file.buffer as unknown as ArrayBuffer);

    res.json(result);
  } catch (err) {
    next(err);
  }
}
