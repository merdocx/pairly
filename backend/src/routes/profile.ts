import { Router, type Request } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { getPool } from '../db/pool.js';
import { authMiddleware, type JwtPayload } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const AVATAR_SIZE = 200;
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

function getAvatarsDir(): string {
  const root = process.cwd();
  const dir = join(root, 'uploads', 'avatars');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      cb(new AppError(400, 'Допустимые форматы: JPEG, PNG, WebP', 'VALIDATION_ERROR'));
      return;
    }
    cb(null, true);
  },
});

export const profileRouter = Router();

profileRouter.put(
  '/avatar',
  authMiddleware,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof AppError) return next(err);
        if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError(400, 'Файл не более 2 МБ', 'VALIDATION_ERROR'));
        return next(err);
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const { userId } = (req as unknown as Request & { user: JwtPayload }).user;
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file || !file.buffer) {
        throw new AppError(400, 'Выберите файл (JPEG, PNG или WebP)', 'VALIDATION_ERROR');
      }
      const avatarsDir = getAvatarsDir();
      const filename = `${userId}.webp`;
      const filepath = join(avatarsDir, filename);

      try {
        await unlink(filepath);
      } catch {
        // старый файл может отсутствовать — игнорируем
      }

      await sharp(file.buffer)
        .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(filepath);

      const avatarUrl = `/api/avatars/${filename}`;
      const pool = getPool();
      await pool.query('UPDATE users SET avatar_url = $1, updated_at = now() WHERE id = $2', [avatarUrl, userId]);

      res.json({ avatar_url: avatarUrl });
    } catch (e) {
      next(e);
    }
  }
);
