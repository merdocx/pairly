import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Protected routes return 401 without or with invalid token', () => {
  it('GET /api/pairs without Authorization returns 401', async () => {
    const res = await request(app).get('/api/pairs');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('GET /api/pairs with invalid Bearer token returns 401', async () => {
    const res = await request(app)
      .get('/api/pairs')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('GET /api/watchlist/me without Authorization returns 401', async () => {
    const res = await request(app).get('/api/watchlist/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('GET /api/watchlist/me with malformed Authorization returns 401', async () => {
    const res = await request(app)
      .get('/api/watchlist/me')
      .set('Authorization', 'Basic foo');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/watchlist/me without Authorization returns 401', async () => {
    const res = await request(app)
      .post('/api/watchlist/me')
      .send({ movie_id: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});
