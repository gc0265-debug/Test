const fs = require('fs');
const path = require('path');
const db = require('./database');

db.exec(`CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER PRIMARY KEY)`);
const current = db.prepare('SELECT MAX(version) as v FROM _schema_version').get()?.v || 0;

if (current < 2) {
  db.exec(`
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS areas;
    DROP TABLE IF EXISTS resources;
    DROP TABLE IF EXISTS archives;
  `);
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  db.prepare('INSERT OR REPLACE INTO _schema_version VALUES (?)').run(2);
}
