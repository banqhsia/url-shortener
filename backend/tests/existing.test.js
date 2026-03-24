/**
 * Existing functionality tests
 * Covers: auth, URL CRUD, redirect, bulk create, stats dashboard
 */
jest.mock('../src/services/cacheService');

const request = require('supertest');
const app = require('../src/app');
const { freshDb, cleanupDb } = require('./helpers');

beforeAll(() => freshDb());
afterAll(() => cleanupDb());

// ─── Auth ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('accepts correct password', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'testpassword' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /api/auth/me', () => {
  it('returns ok:false when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});

// ─── Authenticated agent ─────────────────────────────────────────────────────

let agent;
beforeAll(async () => {
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ password: 'testpassword' });
});

describe('POST /api/auth/logout', () => {
  it('logs out successfully', async () => {
    const tempAgent = request.agent(app);
    await tempAgent.post('/api/auth/login').send({ password: 'testpassword' });
    const res = await tempAgent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    const me = await tempAgent.get('/api/auth/me');
    expect(me.body.ok).toBe(false);
  });
});

// ─── URL CRUD ─────────────────────────────────────────────────────────────────

describe('POST /api/urls', () => {
  it('creates a URL with auto-generated code', async () => {
    const res = await agent
      .post('/api/urls')
      .send({ original_url: 'https://example.com' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBeTruthy();
    expect(res.body.original_url).toBe('https://example.com');
  });

  it('creates a URL with custom code', async () => {
    const res = await agent
      .post('/api/urls')
      .send({ original_url: 'https://example.com/custom', code: 'mycode' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('mycode');
  });

  it('rejects non-http/https URL', async () => {
    const res = await agent
      .post('/api/urls')
      .send({ original_url: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate custom code', async () => {
    await agent.post('/api/urls').send({ original_url: 'https://a.com', code: 'dupcode' });
    const res = await agent
      .post('/api/urls')
      .send({ original_url: 'https://b.com', code: 'dupcode' });
    expect(res.status).toBe(409);
  });

  it('rejects invalid code characters', async () => {
    const res = await agent
      .post('/api/urls')
      .send({ original_url: 'https://example.com', code: 'bad code!' });
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/urls')
      .send({ original_url: 'https://example.com' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/urls', () => {
  it('returns paginated list', async () => {
    const res = await agent.get('/api/urls');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toHaveProperty('total');
  });

  it('supports search', async () => {
    await agent.post('/api/urls').send({ original_url: 'https://searchable-unique-url.com' });
    const res = await agent.get('/api/urls?q=searchable-unique-url');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].original_url).toContain('searchable-unique-url');
  });

  it('supports pagination params', async () => {
    const res = await agent.get('/api/urls?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });
});

describe('GET /api/urls/:id', () => {
  let createdId;
  beforeAll(async () => {
    const res = await agent
      .post('/api/urls')
      .send({ original_url: 'https://getone.com' });
    createdId = res.body.id;
  });

  it('returns the URL record', async () => {
    const res = await agent.get(`/api/urls/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdId);
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await agent.get('/api/urls/999999');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/urls/:id', () => {
  let record;
  beforeAll(async () => {
    const res = await agent
      .post('/api/urls')
      .send({ original_url: 'https://update-me.com' });
    record = res.body;
  });

  it('updates original_url', async () => {
    const res = await agent
      .put(`/api/urls/${record.id}`)
      .send({ original_url: 'https://updated.com' });
    expect(res.status).toBe(200);
    expect(res.body.original_url).toBe('https://updated.com');
  });

  it('updates code', async () => {
    const res = await agent
      .put(`/api/urls/${record.id}`)
      .send({ code: 'newcode123' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe('newcode123');
  });

  it('returns 409 on duplicate code', async () => {
    const other = await agent
      .post('/api/urls')
      .send({ original_url: 'https://other.com', code: 'takencode' });
    const res = await agent
      .put(`/api/urls/${record.id}`)
      .send({ code: 'takencode' });
    expect(res.status).toBe(409);
    expect(other.status).toBe(201);
  });
});

describe('DELETE /api/urls/:id', () => {
  it('deletes a URL and returns 204', async () => {
    const created = await agent
      .post('/api/urls')
      .send({ original_url: 'https://delete-me.com' });
    const res = await agent.delete(`/api/urls/${created.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 for missing ID', async () => {
    const res = await agent.delete('/api/urls/999999');
    expect(res.status).toBe(404);
  });
});

// ─── Bulk create ─────────────────────────────────────────────────────────────

describe('POST /api/urls/bulk', () => {
  it('creates multiple URLs', async () => {
    const res = await agent.post('/api/urls/bulk').send({
      urls: ['https://bulk1.com', 'https://bulk2.com', 'https://bulk3.com'],
    });
    expect(res.status).toBe(201);
    expect(res.body.results.length).toBe(3);
    expect(res.body.errors.length).toBe(0);
  });

  it('separates valid and invalid URLs', async () => {
    const res = await agent.post('/api/urls/bulk').send({
      urls: ['https://valid.com', 'not-a-url'],
    });
    expect(res.status).toBe(201);
    expect(res.body.results.length).toBe(1);
    expect(res.body.errors.length).toBe(1);
  });

  it('rejects empty array', async () => {
    const res = await agent.post('/api/urls/bulk').send({ urls: [] });
    expect(res.status).toBe(400);
  });
});

// ─── Redirect ─────────────────────────────────────────────────────────────────

describe('GET /:code (redirect)', () => {
  let code;
  beforeAll(async () => {
    const res = await agent
      .post('/api/urls')
      .send({ original_url: 'https://redirect-target.com' });
    code = res.body.code;
  });

  it('redirects to the original URL', async () => {
    const res = await request(app).get(`/${code}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://redirect-target.com');
  });

  it('returns 404 for unknown code', async () => {
    const res = await request(app).get('/zzzznotfound');
    expect(res.status).toBe(404);
  });
});

// ─── Stats dashboard ─────────────────────────────────────────────────────────

describe('GET /api/stats/dashboard', () => {
  it('returns dashboard stats', async () => {
    const res = await agent.get('/api/stats/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_urls');
    expect(res.body).toHaveProperty('today_clicks_total');
    expect(Array.isArray(res.body.top_urls)).toBe(true);
  });
});
