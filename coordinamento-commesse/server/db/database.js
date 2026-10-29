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
ensureColumns('decisioni', [{ name: 'rif_requisito_id', def: 'INTEGER REFERENCES requisiti(id) ON DELETE SET NULL' }]);
ensureColumns('allert', [{ name: 'rif_requisito_id', def: 'INTEGER REFERENCES requisiti(id) ON DELETE SET NULL' }]);
ensureColumns('milestone', [
  { name: 'baseline_data_inizio', def: 'TEXT' },
  { name: 'baseline_data_fine', def: 'TEXT' },
]);
ensureColumns('requisiti', [{ name: 'rif_capitolato_voce_id', def: 'INTEGER REFERENCES capitolato_voci(id) ON DELETE SET NULL' }]);
// milestone create prima di questa modifica: la baseline parte dalle date correnti,
// così da non mostrare uno scostamento inesistente al primo avvio dopo l'aggiornamento.
db.exec(`
  UPDATE milestone SET baseline_data_inizio = data_inizio, baseline_data_fine = data_fine
  WHERE baseline_data_inizio IS NULL
`);

// Migrazione più invasiva: alcune colonne erano vincolate con CHECK a un
// elenco fisso di valori, ma devono poter accettare le liste configurabili
// dalla pagina Impostazioni (tabella categorie). SQLite non supporta
// ALTER TABLE per rimuovere un CHECK, quindi si ricrea la tabella
// (copia dati → elimina la vecchia → rinomina la nuova), avvolta in una
// transazione e con i vincoli di chiave esterna disattivati solo per la
// durata dell'operazione. checkMarker individua se quella specifica
// colonna ha ancora il CHECK da rimuovere (le altre colonne della stessa
// tabella possono avere CHECK propri che restano intatti).
function dropColumnCheck(table, checkMarker, createNewTableSql) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table);
  if (!row || !row.sql.includes(checkMarker)) return; // già migrata, o tabella non ancora creata con il vecchio schema

  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  const wasForeignKeysOn = db.pragma('foreign_keys', { simple: true }) === 1;
  if (wasForeignKeysOn) db.pragma('foreign_keys = OFF');
  const tmp = `${table}__migrating`;
  const migra = db.transaction(() => {
    db.exec(`DROP TABLE IF EXISTS ${tmp};`);
    db.exec(createNewTableSql.replace(/__TABLE__/g, tmp));
    db.exec(`INSERT INTO ${tmp} (${cols.join(',')}) SELECT ${cols.join(',')} FROM ${table};`);
    db.exec(`DROP TABLE ${table};`);
    db.exec(`ALTER TABLE ${tmp} RENAME TO ${table};`);
  });
  migra();
  if (wasForeignKeysOn) db.pragma('foreign_keys = ON');
}

dropColumnCheck('stakeholder', "CHECK(categoria IN", `
  CREATE TABLE __TABLE__ (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    organizzazione TEXT,
    ruolo TEXT,
    categoria TEXT NOT NULL DEFAULT 'interno',
    interesse TEXT NOT NULL DEFAULT 'medio' CHECK(interesse IN ('basso','medio','alto')),
    influenza TEXT NOT NULL DEFAULT 'media' CHECK(influenza IN ('bassa','media','alta')),
    email TEXT,
    telefono TEXT,
    stato TEXT NOT NULL DEFAULT 'attivo' CHECK(stato IN ('attivo','non-attivo')),
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

dropColumnCheck('allert', "CHECK(perimetro IN", `
  CREATE TABLE __TABLE__ (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
    data TEXT NOT NULL DEFAULT (date('now')),
    perimetro TEXT NOT NULL DEFAULT 'interno',
    classificazione TEXT NOT NULL DEFAULT 'attenzione' CHECK(classificazione IN ('informativo','attenzione','critico')),
    descrizione TEXT NOT NULL,
    azione_tutela TEXT,
    rif_documento TEXT,
    rif_criticita_id INTEGER REFERENCES criticita(id) ON DELETE SET NULL,
    rif_decisione_id INTEGER REFERENCES decisioni(id) ON DELETE SET NULL,
    rif_requisito_id INTEGER REFERENCES requisiti(id) ON DELETE SET NULL,
    stato TEXT NOT NULL DEFAULT 'aperto' CHECK(stato IN ('aperto','monitorato','chiuso')),
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

dropColumnCheck('processi_comunicazione', "CHECK(frequenza IN", `
  CREATE TABLE __TABLE__ (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    scopo TEXT,
    frequenza TEXT NOT NULL DEFAULT 'settimanale',
    canale TEXT,
    output TEXT,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

dropColumnCheck('requisiti', "CHECK(fase IN", `
  CREATE TABLE __TABLE__ (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
    codice_wbs TEXT NOT NULL,
    fase TEXT NOT NULL DEFAULT 'progettazione',
    titolo TEXT NOT NULL,
    descrizione TEXT,
    fonte_capitolato TEXT,
    stato TEXT NOT NULL DEFAULT 'bozza' CHECK(stato IN ('bozza','approvato','in-revisione','superato')),
    versione_corrente INTEGER NOT NULL DEFAULT 1,
    rif_capitolato_voce_id INTEGER REFERENCES capitolato_voci(id) ON DELETE SET NULL,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

module.exports = db;
