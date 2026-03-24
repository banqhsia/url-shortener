const { getDb } = require('../config/db');

function getStartOfTodayUTC8() {
  // Shift now to UTC+8, floor to day boundary, shift back to UTC
  const now = Date.now();
  const utc8Offset = 8 * 60 * 60 * 1000;
  const utc8Now = now + utc8Offset;
  const startOfDayUTC8 = utc8Now - (utc8Now % (24 * 60 * 60 * 1000));
  return Math.floor((startOfDayUTC8 - utc8Offset) / 1000);
}

function dashboard(req, res) {
  const db = getDb();
  const startOfToday = getStartOfTodayUTC8();

  const topUrls = db
    .prepare(
      `SELECT u.id, u.code, u.original_url, COUNT(ce.id) AS clicks_today
       FROM click_events ce
       JOIN urls u ON u.id = ce.url_id
       WHERE ce.clicked_at >= ?
       GROUP BY ce.url_id
       ORDER BY clicks_today DESC
       LIMIT 10`
    )
    .all(startOfToday);

  const todayTotal = db
    .prepare('SELECT COUNT(*) AS count FROM click_events WHERE clicked_at >= ?')
    .get(startOfToday).count;

  const totalUrls = db.prepare('SELECT COUNT(*) AS count FROM urls').get().count;

  res.json({
    total_urls: totalUrls,
    today_clicks_total: todayTotal,
    top_urls: topUrls,
  });
}

/**
 * GET /api/stats/url/:id?period=7d|30d
 * Returns per-URL daily click counts for the requested period (UTC+8 day boundaries).
 */
function urlStats(req, res) {
  const db = getDb();
  const urlId = parseInt(req.params.id, 10);
  if (!Number.isInteger(urlId) || urlId <= 0) {
    return res.status(400).json({ error: 'Invalid URL id' });
  }

  const url = db.prepare('SELECT id, code, original_url, click_count FROM urls WHERE id = ?').get(urlId);
  if (!url) return res.status(404).json({ error: 'Not found' });

  const periodDays = req.query.period === '30d' ? 30 : 7;

  // Build day buckets aligned to UTC+8 midnight
  const utc8Offset = 8 * 60 * 60 * 1000;
  const now = Date.now();
  const utc8Now = now + utc8Offset;
  const todayStartUTC8 = utc8Now - (utc8Now % (24 * 60 * 60 * 1000));

  const buckets = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    const dayStartUTC8 = todayStartUTC8 - i * 24 * 60 * 60 * 1000;
    const dayEndUTC8 = dayStartUTC8 + 24 * 60 * 60 * 1000;
    const startSec = Math.floor((dayStartUTC8 - utc8Offset) / 1000);
    const endSec = Math.floor((dayEndUTC8 - utc8Offset) / 1000);
    const dateLabel = new Date(dayStartUTC8).toISOString().slice(0, 10); // YYYY-MM-DD
    buckets.push({ date: dateLabel, start: startSec, end: endSec, clicks: 0 });
  }

  const windowStart = buckets[0].start;
  const rows = db
    .prepare(
      'SELECT clicked_at FROM click_events WHERE url_id = ? AND clicked_at >= ? ORDER BY clicked_at'
    )
    .all(urlId, windowStart);

  for (const row of rows) {
    for (const bucket of buckets) {
      if (row.clicked_at >= bucket.start && row.clicked_at < bucket.end) {
        bucket.clicks++;
        break;
      }
    }
  }

  const daily = buckets.map(({ date, clicks }) => ({ date, clicks }));

  res.json({
    url,
    period: `${periodDays}d`,
    total_clicks: daily.reduce((s, d) => s + d.clicks, 0),
    daily,
  });
}

module.exports = { dashboard, urlStats };
