const { getCachedUrl, setCachedUrl } = require('../services/cacheService');
const { getUrlByCode, incrementClickCount } = require('../services/urlService');

async function redirect(req, res) {
  const { code } = req.params;

  let record = await getCachedUrl(code);

  if (!record) {
    record = getUrlByCode(code);
    if (!record) return res.status(404).send('Short URL not found');
    await setCachedUrl(code, record);
  }

  // Non-blocking increment — send redirect first
  setImmediate(() => incrementClickCount(record.id));

  res.redirect(302, record.original_url);
}

module.exports = { redirect };
