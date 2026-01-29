import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth.js';
import { moviesRouter } from './routes/movies.js';
import { pairsRouter } from './routes/pairs.js';
import { watchlistRouter } from './routes/watchlist.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/pairs', pairsRouter);
app.use('/api/movies', moviesRouter);
app.use('/api/watchlist', watchlistRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use(errorHandler);
