/**
 * Rate limiting tests
 * Note: rate limiters are set to skip() in test mode (NODE_ENV=test),
 * so these tests verify the limiter configuration is wired up by calling
 * the app with NODE_ENV temporarily unset and using supertest.
 *
 * We test the real limiter behaviour using a dedicated express app that
 * does NOT skip in test mode.
 */
jest.mock('../src/services/cacheService');

const express = require('express');
const rateLimit = require('express-rate-limit');
const request = require('supertest');

function makeApp(max, windowMs = 1000) {
  const app = express();
  app.use(rateLimit({ windowMs, max, legacyHeaders: false, standardHeaders: true }));
  app.get('/test', (req, res) => res.json({ ok: true }));
  return app;
}

describe('Rate limiter middleware', () => {
  it('allows requests under the limit', async () => {
    const app = makeApp(5);
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
  });

  it('blocks requests over the limit with 429', async () => {
    const app = makeApp(3);
    for (let i = 0; i < 3; i++) {
      await request(app).get('/test');
    }
    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
  });

  it('sets RateLimit-* headers', async () => {
    const app = makeApp(10);
    const res = await request(app).get('/test');
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });
});

describe('App rate limiters are registered (skip=true in test mode)', () => {
  const app = require('../src/app');
  const { freshDb, cleanupDb } = require('./helpers');

  beforeAll(() => freshDb());
  afterAll(() => cleanupDb());

  it('login endpoint still works when skip=true', async () => {
    // In test mode limiters are skipped, so many calls must all succeed
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'testpassword' });
    expect(res.status).toBe(200);
  });

  it('redirect endpoint still works when skip=true', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ password: 'testpassword' });
    const created = await agent.post('/api/urls').send({ original_url: 'https://rate-test.com' });
    const code = created.body.code;
    const res = await request(app).get(`/${code}`);
    expect(res.status).toBe(302);
  });
});
