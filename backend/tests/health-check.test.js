/**
 * URL health check service tests
 * Tests checkUrl() and runHealthChecks() with mocked HTTP requests
 */
jest.mock('../src/services/cacheService');

const { checkUrl, runHealthChecks, stopHealthCheckScheduler } = require('../src/services/healthCheckService');
const { getDb } = require('../src/config/db');
const { freshDb, cleanupDb } = require('./helpers');

// Mock http/https modules
const http = require('http');
const https = require('https');

afterAll(() => {
  stopHealthCheckScheduler();
  cleanupDb();
});

// ─── checkUrl ────────────────────────────────────────────────────────────────

describe('checkUrl()', () => {
  it('returns true when server responds', async () => {
    // Mock a minimal HTTP server response
    jest.spyOn(https, 'request').mockImplementation((url, opts, cb) => {
      const fakeRes = { resume: jest.fn() };
      cb(fakeRes);
      return { on: jest.fn(), end: jest.fn() };
    });

    const result = await checkUrl('https://alive.example.com');
    expect(result).toBe(true);
    jest.restoreAllMocks();
  });

  it('returns false on connection error', async () => {
    jest.spyOn(https, 'request').mockImplementation((url, opts, cb) => {
      const emitter = { on: jest.fn(), end: jest.fn() };
      // Simulate error event
      emitter.on.mockImplementation((event, handler) => {
        if (event === 'error') setTimeout(handler, 0);
        return emitter;
      });
      return emitter;
    });

    const result = await checkUrl('https://dead.example.com');
    expect(result).toBe(false);
    jest.restoreAllMocks();
  });

  it('uses http module for http:// URLs', async () => {
    const spy = jest.spyOn(http, 'request').mockImplementation((url, opts, cb) => {
      const fakeRes = { resume: jest.fn() };
      cb(fakeRes);
      return { on: jest.fn(), end: jest.fn() };
    });

    const result = await checkUrl('http://alive.example.com');
    expect(result).toBe(true);
    expect(spy).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

// ─── runHealthChecks ─────────────────────────────────────────────────────────

describe('runHealthChecks()', () => {
  beforeEach(() => freshDb());

  it('updates is_alive and last_checked_at for seeded URLs', async () => {
    const db = getDb();
    // Insert a test URL directly
    db.prepare("INSERT INTO urls (code, original_url) VALUES ('hctest1', 'https://alive-check.com')").run();
    const row = db.prepare("SELECT id FROM urls WHERE code = 'hctest1'").get();

    // Mock checkUrl to always return true
    jest.spyOn(https, 'request').mockImplementation((url, opts, cb) => {
      const fakeRes = { resume: jest.fn() };
      cb(fakeRes);
      return { on: jest.fn(), end: jest.fn() };
    });

    await runHealthChecks();

    const updated = db.prepare('SELECT is_alive, last_checked_at FROM urls WHERE id = ?').get(row.id);
    expect(updated.is_alive).toBe(1);
    expect(updated.last_checked_at).toBeGreaterThan(0);
    jest.restoreAllMocks();
  });

  it('sets is_alive=0 when URL is unreachable', async () => {
    const db = getDb();
    db.prepare("INSERT INTO urls (code, original_url) VALUES ('hctest2', 'https://dead-check.com')").run();
    const row = db.prepare("SELECT id FROM urls WHERE code = 'hctest2'").get();

    jest.spyOn(https, 'request').mockImplementation((url, opts, cb) => {
      const emitter = { on: jest.fn(), end: jest.fn() };
      emitter.on.mockImplementation((event, handler) => {
        if (event === 'error') setTimeout(handler, 0);
        return emitter;
      });
      return emitter;
    });

    await runHealthChecks();

    const updated = db.prepare('SELECT is_alive FROM urls WHERE id = ?').get(row.id);
    expect(updated.is_alive).toBe(0);
    jest.restoreAllMocks();
  });

  it('URLs start with is_alive = null before first check', () => {
    const db = getDb();
    db.prepare("INSERT INTO urls (code, original_url) VALUES ('hctest3', 'https://unchecked.com')").run();
    const row = db.prepare("SELECT is_alive FROM urls WHERE code = 'hctest3'").get();
    expect(row.is_alive).toBeNull();
  });

  it('prioritises URLs not recently checked (oldest last_checked_at first)', async () => {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);

    db.prepare("INSERT INTO urls (code, original_url, last_checked_at) VALUES ('hcold', 'https://old.com', ?)")
      .run(now - 1000);
    db.prepare("INSERT INTO urls (code, original_url, last_checked_at) VALUES ('hcnew', 'https://new.com', ?)")
      .run(now);
    db.prepare("INSERT INTO urls (code, original_url) VALUES ('hcnull', 'https://null.com')")
      .run();

    const checkedOrder = [];
    jest.spyOn(https, 'request').mockImplementation((url, opts, cb) => {
      checkedOrder.push(url);
      cb({ resume: jest.fn() });
      return { on: jest.fn(), end: jest.fn() };
    });

    await runHealthChecks();

    // null (0) and old (now-1000) should be before new (now)
    const nullIdx = checkedOrder.findIndex(u => u.includes('null.com'));
    const oldIdx = checkedOrder.findIndex(u => u.includes('old.com'));
    const newIdx = checkedOrder.findIndex(u => u.includes('new.com'));

    expect(nullIdx).toBeLessThan(newIdx);
    expect(oldIdx).toBeLessThan(newIdx);
    jest.restoreAllMocks();
  });
});
