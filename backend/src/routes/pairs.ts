import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../db/pool.js';
import { authMiddleware, type JwtPayload } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

function generatePairCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

const joinSchema = z.object({
  code: z.string().length(6, 'Код пары — 6 цифр').regex(/^\d{6}$/, 'Код пары — только цифры'),
});

export const pairsRouter = Router();
pairsRouter.use(authMiddleware);

pairsRouter.get('/', async (req, res, next) => {
  try {
    const { userId } = (req as Request & { user: JwtPayload }).user;
    const pool = getPool();
    const pair = await pool.query(
      `SELECT p.id, p.code, p.user_a_id, p.user_b_id, p.created_at,
              ua.email AS user_a_email, ua.name AS user_a_name,
              ub.email AS user_b_email, ub.name AS user_b_name
       FROM pairs p
       JOIN users ua ON ua.id = p.user_a_id
       LEFT JOIN users ub ON ub.id = p.user_b_id
       WHERE p.user_a_id = $1 OR p.user_b_id = $1`,
      [userId]
    );
    if (pair.rows.length === 0) {
      return res.json({ pair: null });
    }
    const row = pair.rows[0];
    const partner =
      row.user_a_id === userId
        ? (row.user_b_id && { id: row.user_b_id, email: row.user_b_email, name: row.user_b_name })
        : { id: row.user_a_id, email: row.user_a_email, name: row.user_a_name };
    res.json({
      pair: {
        id: row.id,
        code: row.code,
        partner: partner || null,
        createdAt: row.created_at,
      },
    });
  } catch (e) {
    next(e);
  }
});

// Create pair (user becomes user_a, gets a 6-digit code)
pairsRouter.post('/create', async (req, res, next) => {
  try {
    const { userId } = (req as Request & { user: JwtPayload }).user;
    const pool = getPool();
    const existing = await pool.query(
      'SELECT id FROM pairs WHERE user_a_id = $1 OR user_b_id = $1',
      [userId]
    );
    if (existing.rows.length > 0) {
      throw new AppError(400, 'Вы уже состоите в паре. Выйдите из текущей пары.', 'ALREADY_IN_PAIR');
    }
    let code = generatePairCode();
    let attempts = 0;
    while (attempts < 10) {
      const conflict = await pool.query('SELECT id FROM pairs WHERE code = $1', [code]);
      if (conflict.rows.length === 0) break;
      code = generatePairCode();
      attempts++;
    }
    await pool.query('INSERT INTO pairs (code, user_a_id) VALUES ($1, $2)', [code, userId]);
    const pair = await pool.query(
      'SELECT id, code, created_at FROM pairs WHERE user_a_id = $1',
      [userId]
    );
    res.status(201).json({ pair: pair.rows[0], message: 'Покажите этот код партнёру' });
  } catch (e) {
    next(e);
  }
});

// Join pair by code
pairsRouter.post('/join', async (req, res, next) => {
  try {
    const body = joinSchema.safeParse(req.body);
    if (!body.success) {
      const msg = body.error.errors.map((e) => e.message).join('; ');
      throw new AppError(400, msg, 'VALIDATION_ERROR');
    }
    const { userId } = (req as Request & { user: JwtPayload }).user;
    const { code } = body.data;
    const pool = getPool();
    const existing = await pool.query(
      'SELECT id FROM pairs WHERE user_a_id = $1 OR user_b_id = $1',
      [userId]
    );
    if (existing.rows.length > 0) {
      throw new AppError(
        400,
        'Вы уже состоите в паре. Выйдите из текущей пары, чтобы присоединиться к другой.',
        'ALREADY_IN_PAIR'
      );
    }
    const pairRow = await pool.query(
      'SELECT id, user_a_id FROM pairs WHERE code = $1 AND user_b_id IS NULL',
      [code]
    );
    if (pairRow.rows.length === 0) {
      throw new AppError(404, 'Код не найден или пара уже сформирована', 'CODE_NOT_FOUND');
    }
    const { id: pairId, user_a_id: userAId } = pairRow.rows[0];
    if (userAId === userId) {
      throw new AppError(400, 'Нельзя присоединиться к своей паре по коду', 'SELF_JOIN');
    }
    await pool.query('UPDATE pairs SET user_b_id = $1 WHERE id = $2', [userId, pairId]);
    const pair = await pool.query(
      `SELECT p.id, p.code, p.created_at, u.email AS partner_email, u.name AS partner_name
       FROM pairs p JOIN users u ON u.id = p.user_a_id WHERE p.id = $1`,
      [pairId]
    );
    res.status(200).json({
      pair: { ...pair.rows[0], partner: { email: pair.rows[0].partner_email, name: pair.rows[0].partner_name } },
      message: 'Вы присоединились к паре',
    });
  } catch (e) {
    next(e);
  }
});

pairsRouter.post('/leave', async (req, res, next) => {
  try {
    const { userId } = (req as Request & { user: JwtPayload }).user;
    const pool = getPool();
    const pair = await pool.query(
      'SELECT id, user_a_id, user_b_id FROM pairs WHERE user_a_id = $1 OR user_b_id = $1',
      [userId]
    );
    if (pair.rows.length === 0) {
      throw new AppError(404, 'Вы не состоите в паре', 'NOT_IN_PAIR');
    }
    const row = pair.rows[0];
    if (row.user_a_id === userId) {
      await pool.query('DELETE FROM pairs WHERE id = $1', [row.id]);
    } else {
      await pool.query('UPDATE pairs SET user_b_id = NULL WHERE id = $1', [row.id]);
    }
    res.json({ message: 'Вы вышли из пары' });
  } catch (e) {
    next(e);
  }
});
