import type { Request, Response, NextFunction } from 'express';

const AUTH_COOKIE_NAME = 'pairly_token';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    if (err.statusCode === 401) {
      res.clearCookie(AUTH_COOKIE_NAME, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }
  const timestamp = new Date().toISOString();
  const details = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error(`[${timestamp}]`, details);
  return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}
