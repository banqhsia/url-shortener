const fs = require('fs');
const path = require('path');
const { getDb } = require('../config/db');

function runMigrations() {
  const db = getDb();
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations/001_init.sql'),
    'utf-8'
  );
  db.exec(sql);
  console.log('Migrations completed');
}

module.exports = { runMigrations };
