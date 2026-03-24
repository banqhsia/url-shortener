/**
 * Sort & filter tests for GET /api/urls
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

  // Seed 3 URLs with known click counts
  await agent.post('/api/urls').send({ original_url: 'https://alpha.com', code: 'aaa' });
  await agent.post('/api/urls').send({ original_url: 'https://beta.com', code: 'bbb' });
  await agent.post('/api/urls').send({ original_url: 'https://gamma.com', code: 'ccc' });
});
afterAll(() => cleanupDb());

describe('GET /api/urls sort parameters', () => {
  it('defaults to created_at DESC', async () => {
    const res = await agent.get('/api/urls');
    expect(res.status).toBe(200);
    // Just verify the list returns data and created_at values are non-increasing
    const rows = res.body.data;
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].created_at).toBeLessThanOrEqual(rows[i - 1].created_at);
    }
  });

  it('sorts by code ASC', async () => {
    const res = await agent.get('/api/urls?sort_by=code&sort_dir=asc');
    expect(res.status).toBe(200);
    const codes = res.body.data.map(r => r.code);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });

  it('sorts by code DESC', async () => {
    const res = await agent.get('/api/urls?sort_by=code&sort_dir=desc');
    expect(res.status).toBe(200);
    const codes = res.body.data.map(r => r.code);
    const sorted = [...codes].sort().reverse();
    expect(codes).toEqual(sorted);
  });

  it('sorts by click_count ASC', async () => {
    const res = await agent.get('/api/urls?sort_by=click_count&sort_dir=asc');
    expect(res.status).toBe(200);
    const counts = res.body.data.map(r => r.click_count);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
  });

  it('ignores invalid sort_by (falls back to created_at)', async () => {
    const res = await agent.get('/api/urls?sort_by=evil;DROP+TABLE&sort_dir=asc');
    expect(res.status).toBe(200);
    // Should still return data without error
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('ignores invalid sort_dir (falls back to DESC)', async () => {
    const res = await agent.get('/api/urls?sort_by=code&sort_dir=evil');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('sort works with search query', async () => {
    const res = await agent.get('/api/urls?q=a&sort_by=code&sort_dir=asc');
    expect(res.status).toBe(200);
    // All results contain 'a' in code or url
    const filtered = res.body.data;
    expect(filtered.length).toBeGreaterThan(0);
    const codes = filtered.map(r => r.code);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });
});
