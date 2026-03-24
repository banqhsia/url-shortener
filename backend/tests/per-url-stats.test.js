/**
 * Per-URL analytics tests
 * GET /api/stats/url/:id?period=7d|30d
 */
jest.mock('../src/services/cacheService');

const request = require('supertest');
const app = require('../src/app');
const { getDb } = require('../src/config/db');
const { freshDb, cleanupDb } = require('./helpers');

let agent;
let urlId;
let urlCode;

beforeAll(async () => {
  freshDb();
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ password: 'testpassword' });

  const res = await agent.post('/api/urls').send({ original_url: 'https://stats-test.com' });
  urlId = res.body.id;
  urlCode = res.body.code;

  // Insert some click events directly
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  db.prepare('INSERT INTO click_events (url_id, clicked_at) VALUES (?, ?)').run(urlId, now);
  db.prepare('INSERT INTO click_events (url_id, clicked_at) VALUES (?, ?)').run(urlId, now - 3600);
  db.prepare('INSERT INTO click_events (url_id, clicked_at) VALUES (?, ?)').run(urlId, now - 86400);
});
afterAll(() => cleanupDb());

describe('GET /api/stats/url/:id', () => {
  it('returns stats for valid URL (7d default)', async () => {
    const res = await agent.get(`/api/stats/url/${urlId}`);
    expect(res.status).toBe(200);
    expect(res.body.url.id).toBe(urlId);
    expect(res.body.period).toBe('7d');
    expect(Array.isArray(res.body.daily)).toBe(true);
    expect(res.body.daily.length).toBe(7);
    expect(typeof res.body.total_clicks).toBe('number');
  });

  it('returns 30 days when period=30d', async () => {
    const res = await agent.get(`/api/stats/url/${urlId}?period=30d`);
    expect(res.status).toBe(200);
    expect(res.body.period).toBe('30d');
    expect(res.body.daily.length).toBe(30);
  });

  it('daily array has date and clicks fields', async () => {
    const res = await agent.get(`/api/stats/url/${urlId}`);
    const day = res.body.daily[0];
    expect(day).toHaveProperty('date');
    expect(day).toHaveProperty('clicks');
    expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('total_clicks matches sum of daily clicks', async () => {
    const res = await agent.get(`/api/stats/url/${urlId}`);
    const sumFromDaily = res.body.daily.reduce((s, d) => s + d.clicks, 0);
    expect(res.body.total_clicks).toBe(sumFromDaily);
  });

  it('counts clicks correctly (today has 2 clicks, yesterday has 1)', async () => {
    const res = await agent.get(`/api/stats/url/${urlId}`);
    const today = res.body.daily[res.body.daily.length - 1];
    const yesterday = res.body.daily[res.body.daily.length - 2];
    expect(today.clicks).toBe(2);
    expect(yesterday.clicks).toBe(1);
  });

  it('returns 404 for non-existent URL id', async () => {
    const res = await agent.get('/api/stats/url/999999');
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid URL id', async () => {
    const res = await agent.get('/api/stats/url/abc');
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).get(`/api/stats/url/${urlId}`);
    expect(res.status).toBe(401);
  });
});
