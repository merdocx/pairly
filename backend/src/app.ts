import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.js';
import { moviesRouter } from './routes/movies.js';
import { pairsRouter } from './routes/pairs.js';
import { watchlistRouter } from './routes/watchlist.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
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
app.use(compression());

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Слишком много попыток. Попробуйте через 15 минут.' });
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

app.use('/api/auth', authRateLimit, authRouter);
app.use('/api/pairs', apiRateLimit, pairsRouter);
app.use('/api/movies', apiRateLimit, moviesRouter);
app.use('/api/watchlist', apiRateLimit, watchlistRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use(errorHandler);
