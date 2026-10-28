// Seed idempotente: popola solo se la tabella commesse è vuota.
// Dati di esempio nello stile reale della commessa 2514RW (ruoli e WP
// della convenzione Field Project), senza riportare nominativi o dati
// identificativi di terzi — sono un punto di partenza, non un'esportazione.

const db = require('./database');

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

seed();
