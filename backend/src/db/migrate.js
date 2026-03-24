const fs = require('fs');
const path = require('path');
const { getDb } = require('../config/db');

function runMigrations() {
  const db = getDb();

  // Ensure migrations tracking table exists
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const alreadyApplied = db
      .prepare('SELECT 1 FROM schema_migrations WHERE filename = ?')
      .get(file);
    if (alreadyApplied) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file);
    console.log(`Migration applied: ${file}`);
  }

  console.log('Migrations completed');
}

module.exports = { runMigrations };
