const fs = require('fs');
const path = require('path');
const { getCachedUrl, setCachedUrl } = require('../services/cacheService');
const { getUrlByCode, incrementClickCount } = require('../services/urlService');

const page404 = fs.readFileSync(path.join(__dirname, '../views/404.html'), 'utf-8');

async function redirect(req, res) {
  const { code } = req.params;

  let record = await getCachedUrl(code);

  if (!record) {
    record = getUrlByCode(code);
    if (!record) return res.status(404).type('html').send(page404);
    await setCachedUrl(code, record);
  }

  // Non-blocking increment — send redirect first
  setImmediate(() => incrementClickCount(record.id));

  res.redirect(302, record.original_url);
}

module.exports = { redirect };
