const db = require('../db/database');

const TABLE_MAP = {
  project: 'projects',
  area: 'areas',
  resource: 'resources',
};

function archiveItem(type, id) {
  const table = TABLE_MAP[type];
  if (!table) throw Object.assign(new Error('Invalid type'), { status: 400 });

  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  if (!row) throw Object.assign(new Error(`${type} not found`), { status: 404 });

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO archives (original_type, original_id, title, description, data, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(type, row.id, row.title, row.description || null, JSON.stringify(row), row.tags);

    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  });

  transaction();
}

function restoreItem(archiveId) {
  const archive = db.prepare('SELECT * FROM archives WHERE id = ?').get(archiveId);
  if (!archive) throw Object.assign(new Error('Archive not found'), { status: 404 });

  const original = JSON.parse(archive.data);
  const table = TABLE_MAP[archive.original_type];
  const cols = Object.keys(original).filter(k => k !== 'id');
  const placeholders = cols.map(() => '?').join(', ');
  const values = cols.map(k => original[k]);

  const transaction = db.transaction(() => {
    const result = db.prepare(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
    ).run(...values);

    db.prepare('DELETE FROM archives WHERE id = ?').run(archiveId);
    return result.lastInsertRowid;
  });

  return transaction();
}

module.exports = { archiveItem, restoreItem };
