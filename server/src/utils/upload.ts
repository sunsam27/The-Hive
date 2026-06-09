import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

type FileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void;

const FILE_FILTERS: Record<string, FileFilter> = {
  images: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
  documents: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed'));
  },
};

function memoryUpload({ fileFilter, maxSize }: { fileFilter?: FileFilter; maxSize?: number } = {}) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSize || 10 * 1024 * 1024 },
    fileFilter,
  });
}

export const avatarUpload = memoryUpload({
  fileFilter: FILE_FILTERS.images,
  maxSize: 5 * 1024 * 1024,
});

export const proofUpload = memoryUpload({
  fileFilter: FILE_FILTERS.documents,
});

export const receiptUpload = memoryUpload({
  fileFilter: FILE_FILTERS.documents,
});

export const ocrUpload = memoryUpload({
  fileFilter: FILE_FILTERS.documents,
});
