const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { DB_PATH } = require('./env');

let db;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function resetDb() {
  if (db) {
    try { db.close(); } catch (_) {}
    db = null;
  }
}

module.exports = { getDb, resetDb };
