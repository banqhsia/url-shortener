const { getDb } = require('../config/db');
const { encode } = require('../utils/hashids');
const { deleteCachedUrl, setCachedUrl } = require('./cacheService');
const { ConflictError } = require('../errors');
const repo = require('../db/urlRepository');

const ALLOWED_SORT_COLUMNS = new Set(['created_at', 'click_count', 'code', 'expires_at']);
const ALLOWED_SORT_DIRS = new Set(['asc', 'desc']);

function getUrls({ page = 1, limit = 25, q = '', sort_by = 'created_at', sort_dir = 'desc' }) {
  const db = getDb();
  const offset = (page - 1) * limit;

  const col = ALLOWED_SORT_COLUMNS.has(sort_by) ? sort_by : 'created_at';
  const dir = ALLOWED_SORT_DIRS.has(sort_dir) ? sort_dir.toUpperCase() : 'DESC';
  const orderClause = `ORDER BY ${col} ${dir}`;

  if (q) {
    const pattern = `%${q}%`;
    const total = db
      .prepare('SELECT COUNT(*) as count FROM urls WHERE code LIKE ? OR original_url LIKE ?')
      .get(pattern, pattern).count;
    const data = db
      .prepare(
        `SELECT * FROM urls WHERE code LIKE ? OR original_url LIKE ? ${orderClause} LIMIT ? OFFSET ?`
      )
      .all(pattern, pattern, limit, offset);
    return { data, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM urls').get().count;
  const data = db
    .prepare(`SELECT * FROM urls ${orderClause} LIMIT ? OFFSET ?`)
    .all(limit, offset);
  return { data, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } };
}

function getUrlById(id) {
  return repo.findById(id);
}

function getUrlByCode(code) {
  return repo.findByCode(code);
}

function createUrl(originalUrl, customCode = null, expiresAt = null) {
  const db = getDb();

  const create = db.transaction(() => {
    const result = db
      .prepare("INSERT INTO urls (code, original_url, expires_at) VALUES ('__placeholder__', ?, ?)")
      .run(originalUrl, expiresAt);
    const id = result.lastInsertRowid;
    const code = customCode || encode(Number(id));

    if (customCode) {
      if (repo.findByCodeExcludingId(customCode, id)) {
        throw new ConflictError(`Code "${customCode}" is already in use`);
      }
    }

    db.prepare('UPDATE urls SET code = ? WHERE id = ?').run(code, id);
    return repo.findById(id);
  });

  return create();
}

function bulkCreateUrls(urls) {
  const db = getDb();
  const results = [];
  const errors = [];

  const run = db.transaction(() => {
    for (const url of urls) {
      try {
        const result = db
          .prepare("INSERT INTO urls (code, original_url) VALUES ('__placeholder__', ?)")
          .run(url);
        const id = result.lastInsertRowid;
        const code = encode(Number(id));
        db.prepare('UPDATE urls SET code = ? WHERE id = ?').run(code, id);
        results.push({ url, code, success: true });
      } catch (err) {
        errors.push({ url, error: err.message });
      }
    }
  });

  run();
  return { results, errors };
}

async function updateUrl(id, { code, original_url, click_count, expires_at }) {
  const existing = repo.findById(id);
  if (!existing) return null;

  const newCode = code !== undefined ? code : existing.code;
  const newUrl = original_url !== undefined ? original_url : existing.original_url;
  const newCount = click_count !== undefined ? click_count : existing.click_count;
  // null clears expiry; undefined means "keep existing"
  const newExpiry = expires_at !== undefined ? expires_at : existing.expires_at;

  try {
    repo.update(id, { code: newCode, original_url: newUrl, click_count: newCount, expires_at: newExpiry });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) throw new ConflictError('Code already in use');
    throw err;
  }

  await deleteCachedUrl(existing.code);
  if (newCode !== existing.code) await deleteCachedUrl(newCode);

  const updated = repo.findById(id);
  await setCachedUrl(updated.code, updated);
  return updated;
}

async function deleteUrl(id) {
  const existing = repo.findById(id);
  if (!existing) return false;

  repo.delete(id);
  await deleteCachedUrl(existing.code);
  return true;
}

function parseDeviceType(ua) {
  if (!ua) return 'unknown';
  const lower = ua.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod|blackberry|opera mini|iemobile/i.test(lower)) return 'mobile';
  if (/bot|crawler|spider|slurp|bingbot|googlebot/i.test(lower)) return 'bot';
  return 'desktop';
}

function incrementClickCount(urlId, referrer = null, userAgent = null) {
  const db = getDb();
  const deviceType = parseDeviceType(userAgent);
  db.prepare(
    'UPDATE urls SET click_count = click_count + 1, updated_at = unixepoch() WHERE id = ?'
  ).run(urlId);
  db.prepare(
    'INSERT INTO click_events (url_id, referrer, device_type) VALUES (?, ?, ?)'
  ).run(urlId, referrer || null, deviceType);
}

module.exports = {
  getUrls,
  getUrlById,
  getUrlByCode,
  createUrl,
  bulkCreateUrls,
  updateUrl,
  deleteUrl,
  incrementClickCount,
};
