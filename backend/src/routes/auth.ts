import { Router, type Request } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getPool } from '../db/pool.js';
import { authMiddleware, type JwtPayload } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default-change-in-production';
const SALT_ROUNDS = 10;
const AUTH_COOKIE_NAME = 'pairly_token';
const COOKIE_MAX_AGE_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней — «помнить меня»
const COOKIE_MAX_AGE_SESSION_MS = 24 * 60 * 60 * 1000; // 24 часа — без «помнить меня»

function setAuthCookie(res: import('express').Response, token: string, rememberMe: boolean) {
  const isProd = process.env.NODE_ENV === 'production';
  const maxAge = rememberMe ? COOKIE_MAX_AGE_REMEMBER_MS : COOKIE_MAX_AGE_SESSION_MS;
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z
    .string()
    .min(8, 'Минимум 8 символов')
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, 'Нужна минимум одна буква и одна цифра'),
  name: z.string().max(255).default(''),
  remember_me: z.boolean().optional().default(true),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember_me: z.boolean().optional().default(true),
});

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) {
      const msg = body.error.errors.map((e) => e.message).join('; ');
      throw new AppError(400, msg, 'VALIDATION_ERROR');
    }
    const { email, password, name, remember_me: rememberMe } = body.data;
    const pool = getPool();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new AppError(409, 'Пользователь с таким email уже зарегистрирован', 'EMAIL_EXISTS');
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, passwordHash, name ?? '']
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email } as JwtPayload,
      JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '24h' }
    );
    setAuthCookie(res, token, rememberMe);
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      throw new AppError(400, 'Некорректный email или пароль', 'VALIDATION_ERROR');
    }
    const { email, password, remember_me: rememberMe } = body.data;
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      throw new AppError(401, 'Некорректный email или пароль', 'UNAUTHORIZED');
    }
    const user = result.rows[0];
    if (!user.password_hash) {
      throw new AppError(401, 'Войдите через Apple', 'UNAUTHORIZED');
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new AppError(401, 'Некорректный email или пароль', 'UNAUTHORIZED');
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email } as JwtPayload,
      JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '24h' }
    );
    setAuthCookie(res, token, rememberMe);
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  res.json({ message: 'Выход выполнен' });
});

authRouter.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = (req as unknown as Request & { user: JwtPayload }).user;
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, email, name, avatar_url FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      throw new AppError(404, 'Пользователь не найден', 'NOT_FOUND');
    }
    res.json(result.rows[0]);
  } catch (e) {
    next(e);
  }
});
