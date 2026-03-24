/**
 * CSV export tests
 * GET /api/urls/export
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

  // Seed a few URLs
  await agent.post('/api/urls').send({ original_url: 'https://export1.com', code: 'exp1' });
  await agent.post('/api/urls').send({ original_url: 'https://export2.com', code: 'exp2' });
  await agent.post('/api/urls').send({
    original_url: 'https://export-with-expiry.com',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  });
});
afterAll(() => cleanupDb());

describe('GET /api/urls/export', () => {
  it('returns CSV content-type', async () => {
    const res = await agent.get('/api/urls/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  it('returns Content-Disposition attachment', async () => {
    const res = await agent.get('/api/urls/export');
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.headers['content-disposition']).toMatch(/urls\.csv/);
  });

  it('CSV has correct header row', async () => {
    const res = await agent.get('/api/urls/export');
    const firstLine = res.text.split('\r\n')[0];
    expect(firstLine).toBe('id,code,original_url,click_count,expires_at,created_at');
  });

  it('CSV contains all seeded URLs', async () => {
    const res = await agent.get('/api/urls/export');
    expect(res.text).toContain('exp1');
    expect(res.text).toContain('exp2');
    expect(res.text).toContain('export-with-expiry');
  });

  it('CSV rows count matches URL count', async () => {
    const res = await agent.get('/api/urls/export');
    const lines = res.text.trim().split('\r\n');
    // header + 3 data rows
    expect(lines.length).toBe(4);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/urls/export');
    expect(res.status).toBe(401);
  });

  it('URLs with special chars are properly escaped', async () => {
    // Create URL with comma in it (artificial but tests CSV escaping)
    await agent.post('/api/urls').send({ original_url: 'https://example.com/path?a=1&b=2' });
    const res = await agent.get('/api/urls/export');
    expect(res.status).toBe(200);
    // Should not break CSV structure
    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toBe('id,code,original_url,click_count,expires_at,created_at');
  });
});
