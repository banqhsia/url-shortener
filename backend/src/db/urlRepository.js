const { getDb } = require('../config/db');

/**
 * Thin data-access wrapper over the urls table.
 * Keeps SQL strings out of business logic and gives methods readable names.
 * Uses the same better-sqlite3 singleton as the rest of the app, so calls
 * made inside a db.transaction() are automatically part of that transaction.
 */
const urlRepository = {
  findById(id) {
    return getDb().prepare('SELECT * FROM urls WHERE id = ?').get(id);
  },

  findByCode(code) {
    return getDb().prepare('SELECT * FROM urls WHERE code = ?').get(code);
  },

  /** Used during creation to detect a custom-code conflict before committing. */
  findByCodeExcludingId(code, id) {
    return getDb().prepare('SELECT id FROM urls WHERE code = ? AND id != ?').get(code, id);
  },

  update(id, { code, original_url, click_count, expires_at }) {
    return getDb()
      .prepare(
        'UPDATE urls SET code = ?, original_url = ?, click_count = ?, expires_at = ?, updated_at = unixepoch() WHERE id = ?'
      )
      .run(code, original_url, click_count, expires_at, id);
  },

  delete(id) {
    return getDb().prepare('DELETE FROM urls WHERE id = ?').run(id);
  },
};

module.exports = urlRepository;
