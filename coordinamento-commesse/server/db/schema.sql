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
    rif_requisito_id INTEGER REFERENCES requisiti(id) ON DELETE SET NULL,  -- approvazione nata da un requisito
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
    scadenza TEXT,                             -- legacy, sostituita da data_inizio/data_fine; non più mostrata in UI
    piano TEXT,
    zona TEXT,
    data_inizio TEXT,
    data_fine TEXT,
    impresa TEXT,
    contratto_id INTEGER,                      -- REFERENCES contratti(id); aggiunta via ensureColumns per rispettare l'ordine di creazione tabelle
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
    wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
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
    baseline_data_inizio TEXT,                 -- congelata alla creazione; non si sposta con le modifiche
    baseline_data_fine TEXT,                   -- successive, a meno di un reset esplicito della baseline
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
    perimetro TEXT NOT NULL DEFAULT 'interno',  -- lista configurabile, vedi tabella categorie ('allert_perimetro')
    classificazione TEXT NOT NULL DEFAULT 'attenzione'
                    CHECK(classificazione IN ('informativo','attenzione','critico')),
    descrizione TEXT NOT NULL,
    azione_tutela TEXT,
    rif_documento TEXT,
    rif_criticita_id INTEGER REFERENCES criticita(id) ON DELETE SET NULL,
    rif_decisione_id INTEGER REFERENCES decisioni(id) ON DELETE SET NULL,
    rif_requisito_id INTEGER REFERENCES requisiti(id) ON DELETE SET NULL,  -- variazione contrattuale segnalata da un requisito
    stato TEXT NOT NULL DEFAULT 'aperto'
          CHECK(stato IN ('aperto','monitorato','chiuso')),
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Capitolato: scrittura in stile tabella con codici WBS, a monte dei
-- Requisiti — una voce di capitolato può generare più requisiti di
-- progetto (collegamento opzionale rif_capitolato_voce_id su requisiti).
CREATE TABLE IF NOT EXISTS capitolato_voci (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    codice_wbs TEXT NOT NULL,
    titolo TEXT NOT NULL,
    data TEXT,
    contratto_id INTEGER,                      -- REFERENCES contratti(id); aggiunta via ensureColumns per rispettare l'ordine di creazione tabelle
    descrizione TEXT,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Requisiti: estratti da un capitolato, con codice WBS per commessa e
-- fase di esecuzione. Ogni modifica sostanziale (titolo/descrizione)
-- crea una nuova riga in requisiti_versioni — base per rilevare le
-- variazioni rispetto alla baseline di un contratto.
CREATE TABLE IF NOT EXISTS requisiti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
    codice_wbs TEXT NOT NULL,                  -- es. 2514RW.WP1.03
    fase TEXT NOT NULL DEFAULT 'progettazione',  -- lista configurabile, vedi tabella categorie ('requisiti_fase')
    titolo TEXT NOT NULL,
    descrizione TEXT,
    fonte_capitolato TEXT,                     -- riferimento al capitolato (paragrafo/pagina/revisione)
    stato TEXT NOT NULL DEFAULT 'bozza'
          CHECK(stato IN ('bozza','approvato','in-revisione','superato')),
    versione_corrente INTEGER NOT NULL DEFAULT 1,
    rif_capitolato_voce_id INTEGER REFERENCES capitolato_voci(id) ON DELETE SET NULL,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS requisiti_versioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requisito_id INTEGER NOT NULL REFERENCES requisiti(id) ON DELETE CASCADE,
    numero_versione INTEGER NOT NULL,
    titolo TEXT NOT NULL,
    descrizione TEXT,
    motivo_modifica TEXT,
    data TEXT NOT NULL DEFAULT (date('now')),
    autore TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Contratto stipulato: baseline del capitolato (data) e procedura di
-- change management concordata. Le versioni di requisiti successive
-- alla baseline sono segnalate come variazioni da gestire (vedi
-- GET /api/contratti/:id/variazioni).
CREATE TABLE IF NOT EXISTS contratti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    titolo TEXT NOT NULL,
    controparte TEXT,
    data_stipula TEXT,
    valore REAL,
    riferimento_capitolato TEXT,
    capitolato_baseline_data TEXT,
    procedura_change_management TEXT,
    stato TEXT NOT NULL DEFAULT 'attivo'
          CHECK(stato IN ('attivo','chiuso')),
    url TEXT,
    file_nome TEXT,
    file_path TEXT,
    file_mime TEXT,
    file_size INTEGER,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Registro Stakeholder: interesse/influenza come da prassi di project
-- management, usato anche dalla matrice interesse/influenza e come
-- base per le assegnazioni RACI del Piano Comunicazioni.
CREATE TABLE IF NOT EXISTS stakeholder (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    organizzazione TEXT,
    ruolo TEXT,
    categoria TEXT NOT NULL DEFAULT 'interno',  -- lista configurabile, vedi tabella categorie ('stakeholder_categoria')
    interesse TEXT NOT NULL DEFAULT 'medio' CHECK(interesse IN ('basso','medio','alto')),
    influenza TEXT NOT NULL DEFAULT 'media' CHECK(influenza IN ('bassa','media','alta')),
    email TEXT,
    telefono TEXT,
    stato TEXT NOT NULL DEFAULT 'attivo' CHECK(stato IN ('attivo','non-attivo')),
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Piano Comunicazioni: un processo di gestione per riga (riunione,
-- aggiornamento registro, approvazione...) con frequenza/canale/output
-- e una matrice RACI verso gli stakeholder della commessa.
CREATE TABLE IF NOT EXISTS processi_comunicazione (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    scopo TEXT,
    frequenza TEXT NOT NULL DEFAULT 'settimanale',  -- lista configurabile, vedi tabella categorie ('comunicazione_frequenza')
    canale TEXT,
    output TEXT,
    ruolo_responsabile TEXT,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Atti Aggiuntivi: varianti/integrazioni economiche al contratto base,
-- sommate al suo valore nella scheda Contratto e nella Dashboard
-- Finanziaria (multi-commessa).
CREATE TABLE IF NOT EXISTS atti_aggiuntivi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contratto_id INTEGER NOT NULL REFERENCES contratti(id) ON DELETE CASCADE,
    titolo TEXT NOT NULL,
    data TEXT,
    valore REAL NOT NULL DEFAULT 0,
    descrizione TEXT,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Categorie: valori configurabili dalla pagina Impostazioni per le
-- liste a tendina che non guidano logica applicativa (a differenza di
-- uno "stato" con transizioni, qui sono etichette pure). 'lista'
-- identifica quale tendina (es. 'stakeholder_categoria').
CREATE TABLE IF NOT EXISTS categorie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lista TEXT NOT NULL,
    valore TEXT NOT NULL,
    etichetta TEXT NOT NULL,
    ordine INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(lista, valore)
);

CREATE TABLE IF NOT EXISTS raci_assegnazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processo_id INTEGER NOT NULL REFERENCES processi_comunicazione(id) ON DELETE CASCADE,
    stakeholder_id INTEGER NOT NULL REFERENCES stakeholder(id) ON DELETE CASCADE,
    ruolo TEXT NOT NULL CHECK(ruolo IN ('R','A','C','I')),
    UNIQUE(processo_id, stakeholder_id)
);

-- Fornitori collegati a una maestranza, scelti fra gli stakeholder della
-- commessa invece che scritti a mano (sostituisce il vecchio campo libero
-- "azienda", mantenuto solo come fallback per le righe create prima).
CREATE TABLE IF NOT EXISTS maestranze_fornitori (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maestranza_id INTEGER NOT NULL REFERENCES maestranze(id) ON DELETE CASCADE,
    stakeholder_id INTEGER NOT NULL REFERENCES stakeholder(id) ON DELETE CASCADE,
    UNIQUE(maestranza_id, stakeholder_id)
);

-- Approvazioni Drawings: elenco elaborati/deliverable sottoposti a DL/GC
-- per approvazione, importabile da un file Excel. Ogni riga può agganciarsi
-- a un Requisito del Capitolato Requisiti, in modo da restare collegata
-- agli altri registri di Coordinamento e Contratti tramite il requisito.
CREATE TABLE IF NOT EXISTS approvazioni_drawings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commessa_id INTEGER NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
    wp_id INTEGER REFERENCES work_packages(id) ON DELETE SET NULL,
    codice TEXT NOT NULL,
    titolo TEXT NOT NULL,
    revisione TEXT,
    data_invio TEXT,
    data_approvazione TEXT,
    stato TEXT NOT NULL DEFAULT 'in-attesa'
          CHECK(stato IN ('in-attesa','approvato','approvato-con-riserve','rigettato')),
    rif_requisito_id INTEGER REFERENCES requisiti(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_capitolato_commessa ON capitolato_voci(commessa_id);
CREATE INDEX IF NOT EXISTS idx_requisiti_commessa ON requisiti(commessa_id);
CREATE INDEX IF NOT EXISTS idx_requisiti_wbs ON requisiti(codice_wbs);
CREATE INDEX IF NOT EXISTS idx_requisiti_versioni_requisito ON requisiti_versioni(requisito_id);
CREATE INDEX IF NOT EXISTS idx_contratti_commessa ON contratti(commessa_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_commessa ON stakeholder(commessa_id);
CREATE INDEX IF NOT EXISTS idx_processi_commessa ON processi_comunicazione(commessa_id);
CREATE INDEX IF NOT EXISTS idx_raci_processo ON raci_assegnazioni(processo_id);
CREATE INDEX IF NOT EXISTS idx_maestranze_fornitori_m ON maestranze_fornitori(maestranza_id);
CREATE INDEX IF NOT EXISTS idx_atti_contratto ON atti_aggiuntivi(contratto_id);
CREATE INDEX IF NOT EXISTS idx_categorie_lista ON categorie(lista);
CREATE INDEX IF NOT EXISTS idx_approvazioni_commessa ON approvazioni_drawings(commessa_id);

-- Sessioni di login persistite su SQLite invece che in memoria: un
-- riavvio o un aggiornamento del server non disconnette più tutti gli
-- utenti collegati (vedi server/utils/sessionStore.js).
CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
