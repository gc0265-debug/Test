const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'coordinamento.db');

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migrazione leggera: CREATE TABLE IF NOT EXISTS non modifica una tabella
// già esistente, quindi un database creato prima dell'introduzione
// dell'allegato file nei Documenti va aggiornato esplicitamente.
function ensureColumns(table, columns) {
  const existing = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  columns.forEach(({ name, def }) => {
    if (!existing.includes(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
  });
}

ensureColumns('documenti', [
  { name: 'file_nome', def: 'TEXT' },
  { name: 'file_path', def: 'TEXT' },
  { name: 'file_mime', def: 'TEXT' },
  { name: 'file_size', def: 'INTEGER' },
]);

module.exports = db;
