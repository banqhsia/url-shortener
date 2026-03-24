const fs = require('fs');
const { resetDb } = require('../src/config/db');
const { runMigrations } = require('../src/db/migrate');

/**
 * Wipe and re-create the test database.
 * Call in beforeAll / beforeEach for a clean slate.
 */
function freshDb() {
  resetDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch (_) {}
  runMigrations();
}

/**
 * Close DB and remove test file.
 * Call in afterAll.
 */
function cleanupDb() {
  resetDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch (_) {}
}

module.exports = { freshDb, cleanupDb };
