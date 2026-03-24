/**
 * Click source tracking tests
 * Verifies referrer + device_type are captured on redirect and surfaced in stats
 */
jest.mock('../src/services/cacheService');

const request = require('supertest');
const app = require('../src/app');
const { getDb } = require('../src/config/db');
const { freshDb, cleanupDb } = require('./helpers');

let agent;
let urlId;
let code;

beforeAll(async () => {
  freshDb();
  agent = request.agent(app);
  await agent.post('/api/auth/login').send({ password: 'testpassword' });

  const res = await agent.post('/api/urls').send({ original_url: 'https://source-test.com' });
  urlId = res.body.id;
  code = res.body.code;
});
afterAll(() => cleanupDb());

// ─── parseDeviceType ─────────────────────────────────────────────────────────

describe('parseDeviceType()', () => {
  const { incrementClickCount } = require('../src/services/urlService');

  it('is not exported — tested indirectly via click_events', async () => {
    // Verify by inserting a click and checking the DB
    await request(app)
      .get(`/${code}`)
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0) AppleWebKit/605.1.15 Mobile/15E148');
    // Give setImmediate time to run
    await new Promise(r => setImmediate(r));
    const db = getDb();
    const row = db.prepare('SELECT device_type FROM click_events WHERE url_id = ? ORDER BY id DESC LIMIT 1').get(urlId);
    expect(row.device_type).toBe('mobile');
  });
});

describe('Referrer and device captured on redirect', () => {
  it('captures desktop device_type', async () => {
    await request(app)
      .get(`/${code}`)
      .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    await new Promise(r => setImmediate(r));
    const db = getDb();
    const row = db.prepare('SELECT device_type FROM click_events WHERE url_id = ? ORDER BY id DESC LIMIT 1').get(urlId);
    expect(row.device_type).toBe('desktop');
  });

  it('captures bot device_type', async () => {
    await request(app)
      .get(`/${code}`)
      .set('User-Agent', 'Googlebot/2.1 (+http://www.google.com/bot.html)');
    await new Promise(r => setImmediate(r));
    const db = getDb();
    const row = db.prepare('SELECT device_type FROM click_events WHERE url_id = ? ORDER BY id DESC LIMIT 1').get(urlId);
    expect(row.device_type).toBe('bot');
  });

  it('captures referrer header', async () => {
    await request(app)
      .get(`/${code}`)
      .set('Referer', 'https://referrer-source.example.com');
    await new Promise(r => setImmediate(r));
    const db = getDb();
    const row = db.prepare('SELECT referrer FROM click_events WHERE url_id = ? ORDER BY id DESC LIMIT 1').get(urlId);
    expect(row.referrer).toBe('https://referrer-source.example.com');
  });

  it('sets referrer to null when no Referer header', async () => {
    await request(app).get(`/${code}`);
    await new Promise(r => setImmediate(r));
    const db = getDb();
    const row = db.prepare('SELECT referrer FROM click_events WHERE url_id = ? ORDER BY id DESC LIMIT 1').get(urlId);
    expect(row.referrer).toBeNull();
  });
});

describe('Stats endpoint includes devices and top_referrers', () => {
  it('devices object present in stats response', async () => {
    const res = await agent.get(`/api/stats/url/${urlId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('devices');
    expect(typeof res.body.devices).toBe('object');
  });

  it('top_referrers array present in stats response', async () => {
    const res = await agent.get(`/api/stats/url/${urlId}`);
    expect(Array.isArray(res.body.top_referrers)).toBe(true);
  });

  it('top_referrers includes the referrer we sent', async () => {
    const res = await agent.get(`/api/stats/url/${urlId}`);
    const found = res.body.top_referrers.some(r => r.referrer === 'https://referrer-source.example.com');
    expect(found).toBe(true);
  });

  it('devices includes mobile from our test click', async () => {
    const res = await agent.get(`/api/stats/url/${urlId}`);
    expect(res.body.devices.mobile).toBeGreaterThan(0);
  });
});
