import { Router, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const resolvePath = (dir: string): string =>
  path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);

export const UPLOAD_DIR = resolvePath(process.env.UPLOAD_DIR ?? 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_UPLOAD_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 5 * 1024 * 1024);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 8);
    const fallbackExt = file.mimetype?.split('/')?.[1] ? `.${file.mimetype.split('/')[1]}` : '';
    const normalizedExt = ext && /^[a-z0-9.]+$/i.test(ext) ? ext : fallbackExt;
    const randomPart = crypto.randomBytes(6).toString('hex');
    const name = `${Date.now()}-${randomPart}${normalizedExt || ''}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('UNSUPPORTED_TYPE'));
  },
});

const router = Router();
const singleUpload = upload.single('file');

const buildPublicBase = (): string => {
  const fallback = `http://localhost:${process.env.PORT ?? 3001}`;
  const base = process.env.PUBLIC_UPLOAD_URL ?? fallback;
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

router.post('/', (req: Request, res: Response) => {
  singleUpload(req, res, (err) => {
    if (err) {
      if (err instanceof MulterError) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        res.status(status).json({ error: err.message });
        return;
      }
      if (err instanceof Error && err.message === 'UNSUPPORTED_TYPE') {
        res.status(415).json({ error: 'Разрешены только изображения' });
        return;
      }
      res.status(500).json({ error: 'Ошибка загрузки' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Файл не найден' });
      return;
    }

    const base = buildPublicBase();
    const url = `${base}/uploads/${encodeURIComponent(req.file.filename)}`;

    res.status(201).json({ url });
  });
});

export default router;
