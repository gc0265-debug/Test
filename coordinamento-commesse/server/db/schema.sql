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
    file_nome TEXT,
    file_path TEXT,
    file_mime TEXT,
    file_size INTEGER,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Milestone / montaggi: date di inizio e fine per commessa, work package,
-- piano e zona — alimenta la timeline a calendario (vista Settimane/Mesi)
-- e gli alert di scadenza/ritardo sul Cruscotto.
CREATE TABLE IF NOT EXISTS milestone (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
    piano TEXT,
    zona TEXT,
    titolo TEXT NOT NULL,
    data_inizio TEXT NOT NULL,
    data_fine TEXT NOT NULL,
    stato TEXT NOT NULL DEFAULT 'pianificata'
          CHECK(stato IN ('pianificata','in-corso','completata')),
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Lezioni Apprese: raccolte dalle altre sezioni (criticità, decisioni,
-- allert) tramite collegamento opzionale, per non ripetere gli stessi
-- errori sulla prossima commessa.
CREATE TABLE IF NOT EXISTS lezioni_apprese (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
    data TEXT NOT NULL DEFAULT (date('now')),
    titolo TEXT NOT NULL,
    cosa_e_successo TEXT,
    cosa_abbiamo_imparato TEXT,
    azione_futura TEXT,
    categoria TEXT NOT NULL DEFAULT 'generale'
              CHECK(categoria IN ('generale','progettazione','logistica','sicurezza','fornitori','coordinamento')),
    rif_criticita_id INTEGER REFERENCES criticita(id) ON DELETE SET NULL,
    rif_decisione_id INTEGER REFERENCES decisioni(id) ON DELETE SET NULL,
    rif_allert_id INTEGER REFERENCES allert(id) ON DELETE SET NULL,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Utenti: accesso con email/password, ruolo admin (gestisce gli utenti)
-- o operatore. Lo storico modifiche registra il nome di chi ha agito.
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    ruolo TEXT NOT NULL DEFAULT 'operatore'
          CHECK(ruolo IN ('admin','operatore')),
    attivo INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Registro Allert: classificazione di perimetro e azioni di tutela
-- (funzione di presidio GC), collegabile alla criticità o decisione
-- che lo ha originato — distinto dal coordinamento operativo ma
-- agganciabile ad esso.
CREATE TABLE IF NOT EXISTS allert (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
    data TEXT NOT NULL DEFAULT (date('now')),
    perimetro TEXT NOT NULL DEFAULT 'interno'
              CHECK(perimetro IN ('interno','gc','dl','committente','fornitore','esterno')),
    classificazione TEXT NOT NULL DEFAULT 'attenzione'
                    CHECK(classificazione IN ('informativo','attenzione','critico')),
    descrizione TEXT NOT NULL,
    azione_tutela TEXT,
    rif_documento TEXT,
    rif_criticita_id INTEGER REFERENCES criticita(id) ON DELETE SET NULL,
    rif_decisione_id INTEGER REFERENCES decisioni(id) ON DELETE SET NULL,
    stato TEXT NOT NULL DEFAULT 'aperto'
          CHECK(stato IN ('aperto','monitorato','chiuso')),
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Storico modifiche: traccia creazione/modifica/chiusura/eliminazione su
-- criticità, decisioni e allert con l'utente autenticato e un riassunto
-- testuale di cosa è cambiato — ai fini di tracciabilità D.Lgs. 81/2008.
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER REFERENCES commesse(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    azione TEXT NOT NULL
          CHECK(azione IN ('creata','modificata','chiusa','riaperta','eliminata','rilancio')),
    utente TEXT,
    dettaglio TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
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
CREATE INDEX IF NOT EXISTS idx_allert_commessa ON allert(commessa_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_commessa ON audit_log(commessa_id);
CREATE INDEX IF NOT EXISTS idx_milestone_commessa ON milestone(commessa_id);
CREATE INDEX IF NOT EXISTS idx_lezioni_commessa ON lezioni_apprese(commessa_id);
