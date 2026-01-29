import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth.js';
import { moviesRouter } from './routes/movies.js';
import { pairsRouter } from './routes/pairs.js';
import { watchlistRouter } from './routes/watchlist.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

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

app.use('/api/auth', authRouter);
app.use('/api/pairs', pairsRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/watchlist', watchlistRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use(errorHandler);
