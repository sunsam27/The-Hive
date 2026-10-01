import { Request, Response, NextFunction } from 'express';
import { extractReceiptData } from '../services/ocrService.js';
import { checkWorkspaceAccess } from '../utils/accessControl.js';
import { checkMonthlyLimit, consumeMetric } from '../services/gate.js';

export async function processReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No receipt image provided' });

    const workspaceId = (req.body as { workspaceId?: string } | undefined)?.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }

    const hasAccess = await checkWorkspaceAccess(workspaceId, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const rejection = await checkMonthlyLimit(workspaceId, 'ocr');
    if (rejection) return res.status(rejection.status).json(rejection.body);

    if (!process.env.OCR_SPACE_API_KEY) {
      return res.status(503).json({ error: 'OCR service is not configured' });
    }

    const result = await extractReceiptData(req.file.buffer as unknown as ArrayBuffer);

    await consumeMetric(workspaceId, 'ocr', 1);

    res.json(result);
  } catch (err: any) {
    if (err.message?.includes('timed out') || err.message?.includes('not configured')) {
      return res.status(408).json({ error: err.message });
    }
    next(err);
  }
}
