import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'fs';
import { join } from 'path';
import { authRouter } from './routes/auth.js';
import { appleAuthRouter } from './routes/appleAuth.js';
import { moviesRouter } from './routes/movies.js';
import { pairsRouter } from './routes/pairs.js';
import { profileRouter } from './routes/profile.js';
import { watchlistRouter } from './routes/watchlist.js';
import { errorHandler } from './middleware/errorHandler.js';
import { AppError } from './middleware/errorHandler.js';

export const app = express();

// За Nginx: доверять X-Forwarded-For для rate-limit и корректного IP
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      reportOnly: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'https://image.tmdb.org', 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        frameSrc: ["'self'", 'https://appleid.apple.com'],
      },
    },
  })
);

const corsOrigin = process.env.WEB_ORIGIN || 'http://localhost:3000';
const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

/** Строгий лимит только для входа и регистрации (защита от перебора паролей) */
const authLoginRegisterLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Слишком много попыток входа. Попробуйте через 15 минут.' });
  },
  skip: (req) => req.method !== 'POST' || (req.path !== '/login' && req.path !== '/register'),
});
/** Лимит для остальных auth-запросов (me, logout, Apple) — щедрый, чтобы не мешать обычному использованию */
const authGeneralLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Слишком много запросов. Попробуйте через 15 минут.' });
  },
});
const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Слишком много запросов. Подождите минуту.' });
  },
});
app.use('/api/auth', authLoginRegisterLimit, authGeneralLimit, authRouter);
app.use('/api/auth', authLoginRegisterLimit, authGeneralLimit, appleAuthRouter);
app.use('/api/pairs', apiRateLimit, pairsRouter);
app.use('/api/movies', apiRateLimit, moviesRouter);
app.use('/api/watchlist', apiRateLimit, watchlistRouter);
app.use('/api/profile', apiRateLimit, profileRouter);

app.get('/api/avatars/:filename', (req, res, next) => {
  const filename = req.params.filename;
  if (!/^[a-f0-9-]+\.webp$/i.test(filename)) {
    return next(new AppError(400, 'Invalid filename', 'VALIDATION_ERROR'));
  }
  const filepath = join(process.cwd(), 'uploads', 'avatars', filename);
  if (!existsSync(filepath)) {
    return next(new AppError(404, 'Not found', 'NOT_FOUND'));
  }
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(filepath);
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use(errorHandler);
