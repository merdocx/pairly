import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Movies API', () => {
  it('GET /api/movies/search without q returns empty results', async () => {
    const res = await request(app).get('/api/movies/search');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    });
  });

  it('GET /api/movies/search?q= returns empty results', async () => {
    const res = await request(app).get('/api/movies/search?q=');
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
  });

  it('GET /api/movies/:id with invalid id returns 400', async () => {
    const res = await request(app).get('/api/movies/0');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('GET /api/movies/:id with non-numeric id returns 400', async () => {
    const res = await request(app).get('/api/movies/abc');
    expect(res.status).toBe(400);
  });
});
