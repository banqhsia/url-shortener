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

module.exports = { dashboard };
