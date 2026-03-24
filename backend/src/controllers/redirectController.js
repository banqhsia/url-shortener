const fs = require('fs');
const path = require('path');
const { getCachedUrl, setCachedUrl } = require('../services/cacheService');
const { getUrlByCode, incrementClickCount } = require('../services/urlService');

const page404 = fs.readFileSync(path.join(__dirname, '../views/404.html'), 'utf-8');
const page410 = fs.readFileSync(path.join(__dirname, '../views/410.html'), 'utf-8');

async function redirect(req, res) {
  const { code } = req.params;

  let record = await getCachedUrl(code);

  if (!record) {
    record = getUrlByCode(code);
    if (!record) return res.status(404).type('html').send(page404);
    await setCachedUrl(code, record);
  }

  // Check expiry (expires_at is stored as Unix seconds)
  if (record.expires_at !== null && record.expires_at !== undefined) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec >= record.expires_at) {
      return res.status(410).type('html').send(page410);
    }
  }

  // Non-blocking increment — send redirect first
  setImmediate(() => incrementClickCount(record.id));

  res.redirect(302, record.original_url);
}

module.exports = { redirect };
