import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default-change-in-production';
const AUTH_COOKIE_NAME = 'pairly_token';

export interface JwtPayload {
  userId: string;
  email: string;
}

function getTokenFromRequest(req: Request): string | null {
  const cookie = req.cookies?.[AUTH_COOKIE_NAME];
  if (cookie) return cookie;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return null;
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return next(new AppError(401, 'Требуется авторизация', 'UNAUTHORIZED'));
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as Request & { user: JwtPayload }).user = payload;
    next();
  } catch {
    return next(new AppError(401, 'Недействительный токен', 'UNAUTHORIZED'));
  }
}

