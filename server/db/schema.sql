-- ============================================================
-- BFP — Board Field Project
-- Schema v3 — Sistema Operativo di Cantiere
-- ============================================================

-- Cantieri (commesse)
CREATE TABLE IF NOT EXISTS cantieri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    address TEXT,
    client TEXT,
    status TEXT NOT NULL DEFAULT 'active'
           CHECK(status IN ('active','suspended','completed')),
    start_date TEXT,
    end_date TEXT,
    budget REAL,
    notes TEXT,
    tags TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Work Packages (layer intermedio Commessa → WP → Lavorazione)
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

-- Lavorazioni (legate a WP)
CREATE TABLE IF NOT EXISTS lavorazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    cantiere_id INTEGER REFERENCES cantieri(id) ON DELETE SET NULL,
    wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'da-fare'
           CHECK(status IN ('da-fare','in-corso','completata','bloccata')),
    priority TEXT NOT NULL DEFAULT 'media'
             CHECK(priority IN ('alta','media','bassa')),
    deadline TEXT,
    impresa TEXT,
    tags TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Giornale di cantiere (container del rituale giornaliero)
CREATE TABLE IF NOT EXISTS giornale (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cantiere_id INTEGER REFERENCES cantieri(id) ON DELETE SET NULL,
    date TEXT NOT NULL DEFAULT (date('now')),
    weather TEXT DEFAULT 'sereno'
             CHECK(weather IN ('sereno','nuvoloso','pioggia','vento','neve')),
    activities TEXT,
    notes TEXT,
    tags TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Presenze giornaliere (figlie di giornale)
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

-- Spese giornaliere (figlie di giornale)
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

-- Ricezione materiali (figlie di giornale)
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

-- Riferimenti NC — Non Conformità (figlie di giornale, link ad app esterna)
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

-- Tempi montaggio — KPI storici per skill estimate
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

-- Maestranze — anagrafico personale/imprese
CREATE TABLE IF NOT EXISTS maestranze (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    role TEXT,
    company TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'attivo'
           CHECK(status IN ('attivo','inattivo')),
    qualifications TEXT,
    tags TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Documenti
CREATE TABLE IF NOT EXISTS documenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'altro'
         CHECK(type IN ('contratto','permesso','disegno','verbale','sicurezza','relazione','altro')),
    cantiere_id INTEGER REFERENCES cantieri(id) ON DELETE SET NULL,
    url TEXT,
    notes TEXT,
    tags TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Archivio
CREATE TABLE IF NOT EXISTS archives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_type TEXT NOT NULL,
    original_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    data TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    archived_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_wp_cantiere          ON work_packages(cantiere_id);
CREATE INDEX IF NOT EXISTS idx_lavorazioni_status   ON lavorazioni(status);
CREATE INDEX IF NOT EXISTS idx_lavorazioni_cantiere ON lavorazioni(cantiere_id);
CREATE INDEX IF NOT EXISTS idx_lavorazioni_wp       ON lavorazioni(wp_id);
CREATE INDEX IF NOT EXISTS idx_giornale_cantiere    ON giornale(cantiere_id);
CREATE INDEX IF NOT EXISTS idx_giornale_date        ON giornale(date);
CREATE INDEX IF NOT EXISTS idx_presenze_giornale    ON presenze(giornale_id);
CREATE INDEX IF NOT EXISTS idx_spese_giornale       ON spese(giornale_id);
CREATE INDEX IF NOT EXISTS idx_materiali_giornale   ON materiali(giornale_id);
CREATE INDEX IF NOT EXISTS idx_nc_giornale          ON nc_riferimenti(giornale_id);
CREATE INDEX IF NOT EXISTS idx_tempi_lavorazione    ON tempi_montaggio(lavorazione_id);
CREATE INDEX IF NOT EXISTS idx_documenti_cantiere   ON documenti(cantiere_id);
CREATE INDEX IF NOT EXISTS idx_archives_type        ON archives(original_type);
