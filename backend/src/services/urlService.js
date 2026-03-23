const { getDb } = require('../config/db');
const { encode } = require('../utils/hashids');
const { deleteCachedUrl, setCachedUrl } = require('./cacheService');

function getUrls({ page = 1, limit = 25, q = '' }) {
  const db = getDb();
  const offset = (page - 1) * limit;

  if (q) {
    const pattern = `%${q}%`;
    const total = db
      .prepare('SELECT COUNT(*) as count FROM urls WHERE code LIKE ? OR original_url LIKE ?')
      .get(pattern, pattern).count;
    const data = db
      .prepare(
        'SELECT * FROM urls WHERE code LIKE ? OR original_url LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      )
      .all(pattern, pattern, limit, offset);
    return { data, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM urls').get().count;
  const data = db
    .prepare('SELECT * FROM urls ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset);
  return { data, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } };
}

function getUrlById(id) {
  return getDb().prepare('SELECT * FROM urls WHERE id = ?').get(id);
}

function getUrlByCode(code) {
  return getDb().prepare('SELECT * FROM urls WHERE code = ?').get(code);
}

function createUrl(originalUrl, customCode = null) {
  const db = getDb();

  const create = db.transaction(() => {
    const result = db
      .prepare("INSERT INTO urls (code, original_url) VALUES ('__placeholder__', ?)")
      .run(originalUrl);
    const id = result.lastInsertRowid;
    const code = customCode || encode(Number(id));

    if (customCode) {
      const existing = db
        .prepare('SELECT id FROM urls WHERE code = ? AND id != ?')
        .get(customCode, id);
      if (existing) throw new Error(`Code "${customCode}" already exists`);
    }

    db.prepare('UPDATE urls SET code = ? WHERE id = ?').run(code, id);
    return db.prepare('SELECT * FROM urls WHERE id = ?').get(id);
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

async function updateUrl(id, { code, original_url, click_count }) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM urls WHERE id = ?').get(id);
  if (!existing) return null;

  const newCode = code !== undefined ? code : existing.code;
  const newUrl = original_url !== undefined ? original_url : existing.original_url;
  const newCount = click_count !== undefined ? click_count : existing.click_count;

  db.prepare(
    'UPDATE urls SET code = ?, original_url = ?, click_count = ?, updated_at = unixepoch() WHERE id = ?'
  ).run(newCode, newUrl, newCount, id);

  await deleteCachedUrl(existing.code);
  if (newCode !== existing.code) await deleteCachedUrl(newCode);

  const updated = db.prepare('SELECT * FROM urls WHERE id = ?').get(id);
  await setCachedUrl(updated.code, updated);
  return updated;
}

async function deleteUrl(id) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM urls WHERE id = ?').get(id);
  if (!existing) return false;

  db.prepare('DELETE FROM urls WHERE id = ?').run(id);
  await deleteCachedUrl(existing.code);
  return true;
}

function incrementClickCount(urlId) {
  const db = getDb();
  db.prepare(
    'UPDATE urls SET click_count = click_count + 1, updated_at = unixepoch() WHERE id = ?'
  ).run(urlId);
  db.prepare('INSERT INTO click_events (url_id) VALUES (?)').run(urlId);
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
