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

CREATE TABLE IF NOT EXISTS lavorazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    cantiere_id INTEGER REFERENCES cantieri(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS giornale (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cantiere_id INTEGER REFERENCES cantieri(id) ON DELETE SET NULL,
    date TEXT NOT NULL DEFAULT (date('now')),
    weather TEXT DEFAULT 'sereno'
             CHECK(weather IN ('sereno','nuvoloso','pioggia','vento','neve')),
    workers_count INTEGER DEFAULT 0,
    activities TEXT,
    issues TEXT,
    notes TEXT,
    tags TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

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

CREATE INDEX IF NOT EXISTS idx_lavorazioni_status   ON lavorazioni(status);
CREATE INDEX IF NOT EXISTS idx_lavorazioni_cantiere ON lavorazioni(cantiere_id);
CREATE INDEX IF NOT EXISTS idx_giornale_cantiere    ON giornale(cantiere_id);
CREATE INDEX IF NOT EXISTS idx_giornale_date        ON giornale(date);
CREATE INDEX IF NOT EXISTS idx_documenti_cantiere   ON documenti(cantiere_id);
CREATE INDEX IF NOT EXISTS idx_archives_type        ON archives(original_type);
CREATE INDEX IF NOT EXISTS idx_archives_date        ON archives(archived_at);
