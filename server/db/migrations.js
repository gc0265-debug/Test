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

if (current < 3) {
  // Non-destructive: add wp_id to lavorazioni (preserves existing data)
  try { db.exec('ALTER TABLE lavorazioni ADD COLUMN wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL'); } catch (_) {}

  // Remove workers_count from giornale by replacing with new column-free approach
  // (workers_count is now tracked in presenze table — leave old column for compat)

  db.exec(`
    CREATE TABLE IF NOT EXISTS work_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cantiere_id INTEGER NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'attivo'
             CHECK(status IN ('attivo','sospeso','completato')),
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS presenze (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giornale_id INTEGER NOT NULL REFERENCES giornale(id) ON DELETE CASCADE,
      persona TEXT NOT NULL,
      impresa TEXT,
      zona TEXT,
      attivita TEXT,
      ora_entrata TEXT,
      ora_uscita TEXT,
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS spese (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giornale_id INTEGER NOT NULL REFERENCES giornale(id) ON DELETE CASCADE,
      descrizione TEXT NOT NULL,
      importo REAL NOT NULL DEFAULT 0,
      categoria TEXT NOT NULL DEFAULT 'altro'
                CHECK(categoria IN ('materiale','trasporto','vitto','attrezzatura','altro')),
      fornitore TEXT,
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS materiali (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giornale_id INTEGER NOT NULL REFERENCES giornale(id) ON DELETE CASCADE,
      descrizione TEXT NOT NULL,
      quantita REAL,
      unita TEXT,
      fornitore TEXT,
      conforme INTEGER NOT NULL DEFAULT 1 CHECK(conforme IN (0,1)),
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS nc_riferimenti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giornale_id INTEGER NOT NULL REFERENCES giornale(id) ON DELETE CASCADE,
      codice_nc TEXT,
      link_esterno TEXT,
      descrizione TEXT NOT NULL,
      stato TEXT NOT NULL DEFAULT 'aperta'
            CHECK(stato IN ('aperta','in-lavorazione','chiusa')),
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS tempi_montaggio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lavorazione_id INTEGER REFERENCES lavorazioni(id) ON DELETE SET NULL,
      giornale_id INTEGER REFERENCES giornale(id) ON DELETE SET NULL,
      tipo_arredo TEXT NOT NULL,
      quantita INTEGER NOT NULL DEFAULT 1,
      durata_minuti INTEGER NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_wp_cantiere       ON work_packages(cantiere_id);
    CREATE INDEX IF NOT EXISTS idx_lavorazioni_wp    ON lavorazioni(wp_id);
    CREATE INDEX IF NOT EXISTS idx_presenze_giornale ON presenze(giornale_id);
    CREATE INDEX IF NOT EXISTS idx_spese_giornale    ON spese(giornale_id);
    CREATE INDEX IF NOT EXISTS idx_materiali_giornale ON materiali(giornale_id);
    CREATE INDEX IF NOT EXISTS idx_nc_giornale       ON nc_riferimenti(giornale_id);
    CREATE INDEX IF NOT EXISTS idx_tempi_lavorazione ON tempi_montaggio(lavorazione_id);
  `);

  db.prepare('INSERT OR REPLACE INTO _schema_version VALUES (?)').run(3);
}

if (current < 4) {
  // Impostazioni utente: soglie dei promemoria. Chiave/valore perché le opzioni
  // sono poche e cambiano di rado — una colonna per opzione costerebbe una
  // migrazione a ogni aggiunta.
  db.exec(`
    CREATE TABLE IF NOT EXISTS impostazioni (
      chiave TEXT PRIMARY KEY,
      valore TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  db.prepare('INSERT OR REPLACE INTO _schema_version VALUES (?)').run(4);
}
