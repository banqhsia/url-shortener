const https = require('https');
const http = require('http');
const { getDb } = require('../config/db');

const TIMEOUT_MS = 8000;
const BATCH_SIZE = 20; // check up to 20 URLs per run to avoid bursts
const INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes

/**
 * Performs a HEAD request to the given URL.
 * Returns true if the server responds with any HTTP status (even 4xx/5xx — the server is alive),
 * returns false on connection error or timeout.
 */
function checkUrl(url) {
  return new Promise((resolve) => {
    let resolved = false;
    const done = (result) => {
      if (!resolved) { resolved = true; resolve(result); }
    };

    const mod = url.startsWith('https') ? https : http;
    let req;
    try {
      req = mod.request(url, { method: 'HEAD', timeout: TIMEOUT_MS }, (res) => {
        res.resume(); // drain socket
        done(true);
      });
    } catch {
      done(false);
      return;
    }

    req.on('timeout', () => { req.destroy(); done(false); });
    req.on('error', () => done(false));
    req.end();
  });
}

async function runHealthChecks() {
  let db;
  try {
    db = getDb();
  } catch {
    return; // DB not ready yet
  }

  const urls = db
    .prepare(
      `SELECT id, original_url FROM urls
       ORDER BY COALESCE(last_checked_at, 0) ASC
       LIMIT ?`
    )
    .all(BATCH_SIZE);

  for (const row of urls) {
    const alive = await checkUrl(row.original_url);
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      'UPDATE urls SET is_alive = ?, last_checked_at = ? WHERE id = ?'
    ).run(alive ? 1 : 0, now, row.id);
  }
}

let _timer = null;

function startHealthCheckScheduler() {
  if (_timer) return;
  // First run after 30s so startup isn't slowed down
  const firstRun = setTimeout(runHealthChecks, 30 * 1000);
  firstRun.unref?.();
  _timer = setInterval(() => {
    runHealthChecks().catch(() => {});
  }, INTERVAL_MS);
  _timer.unref?.();
}

function stopHealthCheckScheduler() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

async function checkAndUpdateUrl(id) {
  const db = getDb();
  const url = db.prepare('SELECT * FROM urls WHERE id = ?').get(id);
  if (!url) return;

  const alive = await checkUrl(url.original_url);
  const now = Math.floor(Date.now() / 1000);

  db.prepare('UPDATE urls SET is_alive = ?, last_checked_at = ? WHERE id = ?')
    .run(alive ? 1 : 0, now, id);

  const updated = db.prepare('SELECT * FROM urls WHERE id = ?').get(id);
  const { setCachedUrl } = require('./cacheService');
  await setCachedUrl(updated.code, updated);
}

module.exports = { checkUrl, runHealthChecks, startHealthCheckScheduler, stopHealthCheckScheduler, checkAndUpdateUrl };
