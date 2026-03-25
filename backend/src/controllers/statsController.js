const { getDb } = require('../config/db');
const { getStartOfTodayUTC8, getDayBucketsUTC8 } = require('../utils/time');

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

  const buckets = getDayBucketsUTC8(periodDays);

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

  // Device type breakdown for the period
  const deviceRows = db
    .prepare(
      `SELECT COALESCE(device_type, 'unknown') AS device_type, COUNT(*) AS count
       FROM click_events WHERE url_id = ? AND clicked_at >= ?
       GROUP BY device_type`
    )
    .all(urlId, windowStart);

  const devices = {};
  for (const r of deviceRows) devices[r.device_type] = r.count;

  // Top referrers for the period (up to 10)
  const referrerRows = db
    .prepare(
      `SELECT COALESCE(referrer, 'direct') AS referrer, COUNT(*) AS count
       FROM click_events WHERE url_id = ? AND clicked_at >= ?
       GROUP BY referrer ORDER BY count DESC LIMIT 10`
    )
    .all(urlId, windowStart);

  res.json({
    url,
    period: `${periodDays}d`,
    total_clicks: daily.reduce((s, d) => s + d.clicks, 0),
    daily,
    devices,
    top_referrers: referrerRows,
  });
}

module.exports = { dashboard, urlStats };
