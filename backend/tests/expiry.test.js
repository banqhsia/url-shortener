/**
 * URL expiry tests
 */
jest.mock('../src/services/cacheService');

const request = require('supertest');
const app = require('../src/app');
const { freshDb, cleanupDb } = require('./helpers');

let agent;
beforeAll(async () => {
  freshDb();
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ password: 'testpassword' });
});
afterAll(() => cleanupDb());

describe('URL expiry — create', () => {
  it('creates URL with expires_at', async () => {
    const futureTs = Math.floor(Date.now() / 1000) + 3600; // 1 hour ahead
    const res = await agent.post('/api/urls').send({
      original_url: 'https://expiry-test.com',
      expires_at: futureTs,
    });
    expect(res.status).toBe(201);
    expect(res.body.expires_at).toBe(futureTs);
  });

  it('creates URL without expires_at (null)', async () => {
    const res = await agent.post('/api/urls').send({ original_url: 'https://no-expiry.com' });
    expect(res.status).toBe(201);
    expect(res.body.expires_at).toBeNull();
  });

  it('rejects invalid expires_at (non-integer)', async () => {
    const res = await agent.post('/api/urls').send({
      original_url: 'https://bad-expiry.com',
      expires_at: 'not-a-number',
    });
    expect(res.status).toBe(400);
  });
});

describe('URL expiry — redirect behaviour', () => {
  it('redirects when URL has not expired', async () => {
    const futureTs = Math.floor(Date.now() / 1000) + 3600;
    const created = await agent.post('/api/urls').send({
      original_url: 'https://future-expiry.com',
      expires_at: futureTs,
    });
    const { code } = created.body;

    const res = await request(app).get(`/${code}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://future-expiry.com');
  });

  it('returns 410 Gone when URL has expired', async () => {
    const pastTs = Math.floor(Date.now() / 1000) - 1; // 1 second in the past
    const created = await agent.post('/api/urls').send({
      original_url: 'https://past-expiry.com',
      expires_at: pastTs,
    });
    const { code } = created.body;

    const res = await request(app).get(`/${code}`);
    expect(res.status).toBe(410);
  });

  it('redirects normally when expires_at is null', async () => {
    const created = await agent.post('/api/urls').send({
      original_url: 'https://no-expiry-redirect.com',
    });
    const { code } = created.body;

    const res = await request(app).get(`/${code}`);
    expect(res.status).toBe(302);
  });
});

describe('URL expiry — update', () => {
  it('can set expiry on existing URL', async () => {
    const created = await agent.post('/api/urls').send({ original_url: 'https://set-expiry.com' });
    const futureTs = Math.floor(Date.now() / 1000) + 7200;

    const res = await agent.put(`/api/urls/${created.body.id}`).send({ expires_at: futureTs });
    expect(res.status).toBe(200);
    expect(res.body.expires_at).toBe(futureTs);
  });

  it('can clear expiry by sending null', async () => {
    const futureTs = Math.floor(Date.now() / 1000) + 7200;
    const created = await agent.post('/api/urls').send({
      original_url: 'https://clear-expiry.com',
      expires_at: futureTs,
    });

    const res = await agent.put(`/api/urls/${created.body.id}`).send({ expires_at: null });
    expect(res.status).toBe(200);
    expect(res.body.expires_at).toBeNull();
  });
});
