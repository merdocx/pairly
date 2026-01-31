import { Router, type Request } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { getPool } from '../db/pool.js';
import { type JwtPayload } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const AUTH_COOKIE_NAME = 'pairly_token';
const APPLE_STATE_COOKIE = 'pairly_apple_state';
const APPLE_STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 min

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_REDIRECT_URI = process.env.APPLE_REDIRECT_URI;
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

function setAuthCookie(res: import('express').Response, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getAppleClientSecret(): string {
  if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_CLIENT_ID || !APPLE_PRIVATE_KEY) {
    throw new AppError(503, 'Sign in with Apple не настроен', 'CONFIG');
  }
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: APPLE_TEAM_ID,
    iat: now,
    exp: now + 15777000, // ~6 months
    aud: 'https://appleid.apple.com',
    sub: APPLE_CLIENT_ID,
  };
  return jwt.sign(payload, APPLE_PRIVATE_KEY, {
    algorithm: 'ES256',
    keyid: APPLE_KEY_ID,
    header: { alg: 'ES256', kid: APPLE_KEY_ID },
  });
}

const appleJwks = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
  cacheMaxAge: 600000,
});

function getAppleSigningKey(header: jwt.JwtHeader, callback: (err: Error | null, key?: string) => void) {
  if (!header.kid) return callback(new Error('No kid in header'));
  appleJwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    if (!key?.getPublicKey()) return callback(new Error('No public key'));
    callback(null, key.getPublicKey());
  });
}

interface AppleIdTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
}

function verifyAppleIdToken(idToken: string): Promise<AppleIdTokenPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      idToken,
      getAppleSigningKey,
      { algorithms: ['RS256'], audience: APPLE_CLIENT_ID, issuer: 'https://appleid.apple.com' },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded as AppleIdTokenPayload);
      }
    );
  });
}

export const appleAuthRouter = Router();

appleAuthRouter.get('/apple', (req, res, next) => {
  if (!APPLE_CLIENT_ID || !APPLE_REDIRECT_URI) {
    return next(new AppError(503, 'Sign in with Apple не настроен', 'CONFIG'));
  }
  const state = randomString(32);
  const nonce = randomString(32);
  res.cookie(APPLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/apple',
    maxAge: APPLE_STATE_MAX_AGE_MS,
  });
  const params = new URLSearchParams({
    client_id: APPLE_CLIENT_ID,
    redirect_uri: APPLE_REDIRECT_URI,
    response_type: 'code',
    response_mode: 'form_post',
    scope: 'name email',
    state,
    nonce,
  });
  res.redirect(302, `https://appleid.apple.com/auth/authorize?${params.toString()}`);
});

appleAuthRouter.post('/apple/callback', async (req, res, next) => {
  try {
    const { code, state, user: userJson } = req.body as { code?: string; state?: string; user?: string };
    if (!code || !state) {
      throw new AppError(400, 'Некорректный ответ от Apple', 'BAD_REQUEST');
    }
    const savedState = req.cookies?.[APPLE_STATE_COOKIE];
    res.clearCookie(APPLE_STATE_COOKIE, { path: '/api/auth/apple', httpOnly: true });
    if (!savedState || savedState !== state) {
      throw new AppError(400, 'Неверный state. Повторите вход.', 'BAD_REQUEST');
    }
    const clientSecret = getAppleClientSecret();
    const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: APPLE_CLIENT_ID!,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: APPLE_REDIRECT_URI!,
      }),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new AppError(401, 'Apple не вернул токен. Повторите вход.', 'APPLE_TOKEN');
    }
    const tokenData = (await tokenRes.json()) as { id_token?: string };
    const idToken = tokenData.id_token;
    if (!idToken) throw new AppError(401, 'Нет id_token от Apple', 'APPLE_TOKEN');
    const payload = await verifyAppleIdToken(idToken);
    const appleSub = payload.sub;
    const appleEmail = payload.email ?? null;
    let firstName = '';
    let lastName = '';
    if (userJson && typeof userJson === 'string') {
      try {
        const userData = JSON.parse(userJson) as { name?: { firstName?: string; lastName?: string }; email?: string };
        if (userData.name) {
          firstName = userData.name.firstName ?? '';
          lastName = userData.name.lastName ?? '';
        }
      } catch {
        // ignore
      }
    }
    const nameFromApple = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Пользователь Apple';
    const pool = getPool();
    let row = (await pool.query(
      'SELECT id, email, name FROM users WHERE apple_id = $1',
      [appleSub]
    )).rows[0];
    if (!row) {
      const email = appleEmail || `apple_${appleSub.slice(0, 8)}@pairly.local`;
      const existingByEmail = (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0];
      if (existingByEmail) {
        await pool.query(
          'UPDATE users SET apple_id = $1, updated_at = now() WHERE id = $2',
          [appleSub, existingByEmail.id]
        );
        row = (await pool.query('SELECT id, email, name FROM users WHERE id = $1', [existingByEmail.id])).rows[0];
      } else {
        const insert = await pool.query(
          'INSERT INTO users (email, password_hash, name, apple_id) VALUES ($1, NULL, $2, $3) RETURNING id, email, name',
          [email, nameFromApple, appleSub]
        );
        row = insert.rows[0];
      }
    }
    const token = jwt.sign(
      { userId: row.id, email: row.email } as JwtPayload,
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    setAuthCookie(res, token);
    const frontOrigin = process.env.WEB_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:3000';
    res.redirect(302, frontOrigin + '/');
  } catch (e) {
    next(e);
  }
});
