import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('Auth validation', () => {
  it('POST /api/auth/register with invalid email returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'pass1234', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/auth/register with short password returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.c', password: 'short', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/auth/register without letter in password returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.c', password: '12345678', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/auth/register without digit in password returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.c', password: 'password', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/auth/login with invalid body returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/auth/login with invalid email returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'x', password: 'y' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
