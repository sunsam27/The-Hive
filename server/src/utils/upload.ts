import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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

function diskUpload(subDir: string, { fileFilter, maxSize }: { fileFilter?: FileFilter; maxSize?: number } = {}) {
  const uploadDir = path.resolve(subDir);
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });

  return multer({ storage, limits: { fileSize: maxSize || 10 * 1024 * 1024 }, fileFilter });
}

export const avatarUpload = diskUpload('uploads/avatars', {
  fileFilter: FILE_FILTERS.images,
  maxSize: 5 * 1024 * 1024,
});

export const proofUpload = diskUpload('uploads/proofs', {
  fileFilter: FILE_FILTERS.documents,
});

export const receiptUpload = diskUpload('uploads/receipts', {
  fileFilter: FILE_FILTERS.documents,
});

export const ocrUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: FILE_FILTERS.documents,
});
