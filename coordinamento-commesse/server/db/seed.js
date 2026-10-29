// Seed idempotente: popola solo se la tabella commesse è vuota.
// Dati di esempio nello stile reale della commessa 2514RW (ruoli e WP
// della convenzione Field Project), senza riportare nominativi o dati
// identificativi di terzi — sono un punto di partenza, non un'esportazione.

const crypto = require('crypto');
const db = require('./database');
const { hashPassword } = require('../utils/auth');

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM commesse').get().n;
  if (count > 0) return;

  const insertCommessa = db.prepare(`
    INSERT INTO commesse (codice, nome, cliente, committente_finale, gc, dl, advisor, direttore_cantiere, data_apertura, stato, note)
    VALUES (@codice, @nome, @cliente, @committente_finale, @gc, @dl, @advisor, @direttore_cantiere, @data_apertura, @stato, @note)
  `);
  const commessaId = insertCommessa.run({
    codice: '2514RW',
    nome: 'Hotel Rosewood Roma',
    cliente: 'GILI Creations Srl',
    committente_finale: 'Colliers',
    gc: 'SAC S.p.A.',
    dl: 'Jacobs',
    advisor: 'Studio Michaelides',
    direttore_cantiere: 'Giovanni Cazzola — Field Project SAS',
    data_apertura: '2026-01-01',
    stato: 'attiva',
    note: 'Commessa di esempio: arredo su misura hospitality di lusso, montaggio in ATI.',
  }).lastInsertRowid;

  const insertWp = db.prepare(`
    INSERT INTO work_packages (commessa_id, codice, nome, pm_responsabile, ordine)
    VALUES (@commessa_id, @codice, @nome, @pm_responsabile, @ordine)
  `);
  const wp = {
    WP1: insertWp.run({ commessa_id: commessaId, codice: 'WP1', nome: 'FOH', pm_responsabile: 'PM WP1', ordine: 1 }).lastInsertRowid,
    WP2: insertWp.run({ commessa_id: commessaId, codice: 'WP2', nome: 'CORRIDOI', pm_responsabile: 'PM WP2', ordine: 2 }).lastInsertRowid,
    WP3: insertWp.run({ commessa_id: commessaId, codice: 'WP3', nome: 'SUITE', pm_responsabile: 'PM WP3', ordine: 3 }).lastInsertRowid,
    WP4: insertWp.run({ commessa_id: commessaId, codice: 'WP4', nome: 'SCALA B', pm_responsabile: 'PM WP4', ordine: 4 }).lastInsertRowid,
  };

  const insertCriticita = db.prepare(`
    INSERT INTO criticita (commessa_id, wp_id, tema, cosa_serve, entro_quando, impatto_programma, destinatario, urgenza, stato, data_apertura, note)
    VALUES (@commessa_id, @wp_id, @tema, @cosa_serve, @entro_quando, @impatto_programma, @destinatario, @urgenza, @stato, @data_apertura, @note)
  `);
  const oggi = new Date();
  const tra3gg = new Date(oggi.getTime() + 3 * 86400000).toISOString().slice(0, 10);
  const oggiStr = oggi.toISOString().slice(0, 10);
  insertCriticita.run({
    commessa_id: commessaId, wp_id: wp.WP1,
    tema: 'Controsoffitto e griglie di ripresa — zona bar',
    cosa_serve: 'Posizione precisa delle griglie, da fornire al GC per sbloccare il montaggio',
    entro_quando: tra3gg, impatto_programma: 'Rischio blocco montaggi se non risolto entro la scadenza',
    destinatario: 'interno — risposta nostra dovuta', urgenza: 'viola', stato: 'aperta', data_apertura: oggiStr,
    note: 'Esempio: criticità ad alta urgenza con scadenza a 3 giorni.',
  });
  insertCriticita.run({
    commessa_id: commessaId, wp_id: wp.WP2,
    tema: 'Finitura di una campionatura ancora da ricevere',
    cosa_serve: 'Conferma scritta del GC sulla finitura approvata',
    entro_quando: null, impatto_programma: 'Produzione prosegue per stralci in attesa di conferma',
    destinatario: 'GC', urgenza: 'verde', stato: 'aperta', data_apertura: oggiStr,
    note: 'Esempio: risposta dovuta dalla controparte, senza termine fisso dichiarato.',
  });

  const insertDecisione = db.prepare(`
    INSERT INTO decisioni (commessa_id, wp_id, tema, domanda_chiusa, a_chi, data_prima_richiesta, impatto_se_non_decisa, stato, conferma_scritta, n_riproposte, note)
    VALUES (@commessa_id, @wp_id, @tema, @domanda_chiusa, @a_chi, @data_prima_richiesta, @impatto_se_non_decisa, @stato, @conferma_scritta, @n_riproposte, @note)
  `);
  const unMeseFa = new Date(oggi.getTime() - 35 * 86400000).toISOString().slice(0, 10);
  insertDecisione.run({
    commessa_id: commessaId, wp_id: wp.WP3,
    tema: 'Sospensione amministrativa su una zona suite',
    domanda_chiusa: 'Confermate la revoca della sospensione entro la prossima finestra utile? (SÌ/NO)',
    a_chi: 'DL', data_prima_richiesta: unMeseFa,
    impatto_se_non_decisa: 'Area non rilevabile, rischio slittamento sulla sequenza di montaggio',
    stato: 'richiesta', conferma_scritta: 0, n_riproposte: 1,
    note: 'Esempio: pendenza oltre 21 giorni, candidata a scrittura formale.',
  });

  const insertLavorazione = db.prepare(`
    INSERT INTO lavorazioni (commessa_id, wp_id, titolo, descrizione, stato, priorita, scadenza, impresa)
    VALUES (@commessa_id, @wp_id, @titolo, @descrizione, @stato, @priorita, @scadenza, @impresa)
  `);
  insertLavorazione.run({
    commessa_id: commessaId, wp_id: wp.WP1,
    titolo: 'Montaggio boiserie corridoio lato camere',
    descrizione: 'Posa pannelli e cornici secondo shop drawing approvato',
    stato: 'in-corso', priorita: 'alta', scadenza: null, impresa: 'Squadra montaggio A',
  });

  console.log(`Seed completato: commessa ${commessaId} (2514RW) con ${Object.keys(wp).length} work package.`);
}

// Crea l'utente amministratore al primissimo avvio (tabella users vuota),
// con una password temporanea generata e stampata solo in console —
// da cambiare dalla pagina Utenti dopo il primo accesso.
function seedAdminUser() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return;

  const tempPassword = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  db.prepare(`
    INSERT INTO users (nome, email, password_hash, ruolo) VALUES (?, ?, ?, 'admin')
  `).run('Giovanni Cazzola', 'admin@giovannicazzola.org', hashPassword(tempPassword));

  console.log('');
  console.log('========================================================');
  console.log(' Primo avvio: creato utente amministratore');
  console.log(' Email:    admin@giovannicazzola.org');
  console.log(` Password: ${tempPassword}`);
  console.log(' Cambiala dalla pagina Utenti dopo il primo accesso.');
  console.log('========================================================');
  console.log('');
}

// Popola le liste configurabili (pagina Impostazioni) con i valori che
// prima erano hardcoded nel client — idempotente per singola lista, così
// un'aggiunta futura di una nuova lista non tocca quelle già personalizzate.
function seedCategorie() {
  const insert = db.prepare('INSERT INTO categorie (lista, valore, etichetta, ordine) VALUES (?, ?, ?, ?)');
  const liste = {
    stakeholder_categoria: [
      ['interno', 'Interno Field Project'], ['gc', 'GC'], ['dl', 'DL'],
      ['committente', 'Committente / GILI'], ['fornitore', 'Fornitore'],
      ['advisor', 'Advisor'], ['ente', 'Ente'], ['altro', 'Altro'],
    ],
    allert_perimetro: [
      ['interno', 'Interno Field Project'], ['gc', 'GC'], ['dl', 'DL'],
      ['committente', 'Committente / GILI'], ['fornitore', 'Fornitore'], ['esterno', 'Esterno'],
    ],
    comunicazione_frequenza: [
      ['giornaliera', 'Giornaliera'], ['settimanale', 'Settimanale'], ['quindicinale', 'Quindicinale'],
      ['mensile', 'Mensile'], ['ad-evento', 'Ad evento'],
    ],
    requisiti_fase: [
      ['progettazione', 'Progettazione'], ['approvvigionamento', 'Approvvigionamento'],
      ['montaggio', 'Montaggio'], ['collaudo', 'Collaudo'],
    ],
    documenti_tipo: [
      ['capitolato', 'Capitolato'], ['elaborato', 'Elaborato'], ['verbale', 'Verbale'],
      ['contratto', 'Contratto'], ['sicurezza', 'Sicurezza'], ['altro', 'Altro'],
    ],
    // Liste "a etichetta bloccata": il valore è fisso (guida la logica
    // dell'app — cruscotti, colori, CHECK a DB), solo il testo mostrato è
    // personalizzabile da Impostazioni (vedi LISTE_BLOCCATE in impostazioni.js).
    criticita_stato: [
      ['aperta', 'Aperta'], ['in-attesa', 'In attesa'], ['chiusa', 'Chiusa'],
    ],
    criticita_urgenza: [
      ['viola', 'Urgente (3gg)'], ['verde', 'Dovuta da controparte'], ['normale', 'Normale'],
    ],
    decisioni_stato: [
      ['richiesta', 'Richiesta'], ['parziale', 'Parziale'], ['decisa', 'Decisa'],
    ],
    allert_stato: [
      ['aperto', 'Aperto'], ['monitorato', 'Monitorato'], ['chiuso', 'Chiuso'],
    ],
    allert_classificazione: [
      ['informativo', 'Informativo'], ['attenzione', 'Attenzione'], ['critico', 'Critico'],
    ],
    milestone_stato: [
      ['pianificata', 'Pianificata'], ['in-corso', 'In corso'], ['completata', 'Completata'],
    ],
    lavorazioni_stato: [
      ['da-fare', 'Da fare'], ['in-corso', 'In corso'], ['completata', 'Completata'], ['bloccata', 'Bloccata'],
    ],
    lavorazioni_priorita: [
      ['alta', 'Alta'], ['media', 'Media'], ['bassa', 'Bassa'],
    ],
    requisiti_stato: [
      ['bozza', 'Bozza'], ['approvato', 'Approvato'], ['in-revisione', 'In revisione'], ['superato', 'Superato'],
    ],
    contratti_stato: [
      ['attivo', 'Attivo'], ['chiuso', 'Chiuso'],
    ],
    stakeholder_stato: [
      ['attivo', 'Attivo'], ['non-attivo', 'Non attivo'],
    ],
    maestranze_stato: [
      ['attivo', 'Attivo'], ['non-attivo', 'Non attivo'],
    ],
    note_stato: [
      ['bozza', 'Bozza'], ['inviata', 'Inviata'],
    ],
  };
  Object.entries(liste).forEach(([lista, voci]) => {
    const count = db.prepare('SELECT COUNT(*) AS n FROM categorie WHERE lista = ?').get(lista).n;
    if (count > 0) return;
    voci.forEach(([valore, etichetta], i) => insert.run(lista, valore, etichetta, i));
  });
}

seed();
seedAdminUser();
seedCategorie();
