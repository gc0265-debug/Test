-- Coordinamento Commesse — Field Project SAS
-- Schema SQLite. Convenzioni allineate a server/db/schema.sql di Board Field Project
-- nello stesso repository: snake_case, CHECK sugli enum, timestamp unixepoch.

CREATE TABLE IF NOT EXISTS commesse (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codice TEXT NOT NULL UNIQUE,              -- es. 2514RW
    nome TEXT NOT NULL,                        -- es. Hotel Rosewood Roma
    cliente TEXT,                              -- committente diretto (es. GILI Creations Srl)
    committente_finale TEXT,                   -- es. Colliers
    gc TEXT,                                   -- General Contractor
    dl TEXT,                                   -- Direzione Lavori
    advisor TEXT,
    direttore_cantiere TEXT,
    data_apertura TEXT,
    stato TEXT NOT NULL DEFAULT 'attiva'
          CHECK(stato IN ('attiva','sospesa','chiusa')),
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS work_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    codice TEXT NOT NULL,                      -- es. WP1
    nome TEXT NOT NULL,                        -- es. FOH
    pm_responsabile TEXT,
    ordine INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Registro Criticità: una criticità per riga, un work package, un'urgenza.
-- Modellato su 2514RW_Registro_Criticita_PM: urgenza "viola" porta una
-- scadenza di risposta (tipicamente 3 giorni), "verde" è una risposta
-- dovuta dalla controparte senza termine fisso dichiarato.
CREATE TABLE IF NOT EXISTS criticita (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
    tema TEXT NOT NULL,
    cosa_serve TEXT,
    entro_quando TEXT,                         -- data (YYYY-MM-DD), obbligatoria se urgenza='viola'
    impatto_programma TEXT,
    destinatario TEXT,                         -- es. SAC, DL, Colliers, interno GILI
    urgenza TEXT NOT NULL DEFAULT 'normale'
            CHECK(urgenza IN ('viola','verde','normale')),
    stato TEXT NOT NULL DEFAULT 'aperta'
          CHECK(stato IN ('aperta','in-attesa','chiusa')),
    data_apertura TEXT NOT NULL DEFAULT (date('now')),
    data_chiusura TEXT,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Registro Decisioni: domande chiuse (SI/NO) rivolte a DL/SAC/GC, con
-- anzianità e conferma scritta — stesso schema di Registro_Decisioni_DL_2514RW.
CREATE TABLE IF NOT EXISTS decisioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
    tema TEXT NOT NULL,
    domanda_chiusa TEXT NOT NULL,              -- formulata come domanda SI/NO
    a_chi TEXT,                                 -- destinatario della decisione
    data_prima_richiesta TEXT NOT NULL DEFAULT (date('now')),
    impatto_se_non_decisa TEXT,
    esito_ultima_riunione TEXT,
    data_decisione TEXT,
    stato TEXT NOT NULL DEFAULT 'richiesta'
          CHECK(stato IN ('richiesta','parziale','decisa')),
    conferma_scritta INTEGER NOT NULL DEFAULT 0,  -- 0/1
    rif_conferma TEXT,
    n_riproposte INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Note di Coordinamento: agenda numerata verso un interlocutore (es. SAC/ATI),
-- composta a partire dai punti aperti di criticita/decisioni al momento della
-- creazione, poi modificabile liberamente prima dell'invio.
CREATE TABLE IF NOT EXISTS note_coordinamento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    data TEXT NOT NULL DEFAULT (date('now')),
    oggetto TEXT NOT NULL,
    destinatari TEXT,
    per_conoscenza TEXT,
    punti_json TEXT NOT NULL DEFAULT '[]',     -- [{wp, tema, testo, stato}]
    stato TEXT NOT NULL DEFAULT 'bozza'
          CHECK(stato IN ('bozza','inviata')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS diario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    data TEXT NOT NULL DEFAULT (date('now')),
    squadre TEXT,
    attivita TEXT,
    eventi TEXT,
    criticita_testo TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS lavorazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
    titolo TEXT NOT NULL,
    descrizione TEXT,
    stato TEXT NOT NULL DEFAULT 'da-fare'
          CHECK(stato IN ('da-fare','in-corso','completata','bloccata')),
    priorita TEXT NOT NULL DEFAULT 'media'
             CHECK(priorita IN ('alta','media','bassa')),
    scadenza TEXT,
    impresa TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS maestranze (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ruolo TEXT,
    azienda TEXT,
    telefono TEXT,
    stato TEXT NOT NULL DEFAULT 'attivo'
          CHECK(stato IN ('attivo','non-attivo')),
    qualifiche TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS documenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    titolo TEXT NOT NULL,
    tipo TEXT DEFAULT 'altro',
    url TEXT,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_wp_commessa ON work_packages(commessa_id);
CREATE INDEX IF NOT EXISTS idx_criticita_commessa ON criticita(commessa_id);
CREATE INDEX IF NOT EXISTS idx_criticita_wp ON criticita(wp_id);
CREATE INDEX IF NOT EXISTS idx_decisioni_commessa ON decisioni(commessa_id);
CREATE INDEX IF NOT EXISTS idx_note_commessa ON note_coordinamento(commessa_id);
CREATE INDEX IF NOT EXISTS idx_diario_commessa ON diario(commessa_id);
CREATE INDEX IF NOT EXISTS idx_lavorazioni_commessa ON lavorazioni(commessa_id);
CREATE INDEX IF NOT EXISTS idx_maestranze_commessa ON maestranze(commessa_id);
CREATE INDEX IF NOT EXISTS idx_documenti_commessa ON documenti(commessa_id);
