import { describe, it, expect, vi } from 'vitest';
import { AppError, errorHandler } from '../middleware/errorHandler.js';
import type { Request, Response, NextFunction } from 'express';

describe('errorHandler', () => {
  it('sends AppError status and body', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const err = new AppError(400, 'Validation failed', 'VALIDATION_ERROR');
    errorHandler(err, {} as Request, res, vi.fn() as NextFunction);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Validation failed', code: 'VALIDATION_ERROR' });
  });

  it('sends 500 for unknown errors', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    errorHandler(new Error('Unexpected'), {} as Request, res, vi.fn() as NextFunction);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Внутренняя ошибка сервера' });
  });
});
