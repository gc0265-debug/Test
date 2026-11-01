// Calcolo di schedulazione sulle dipendenze fra attività della Timeline
// (milestone e lavorazioni): rilevamento conflitti fra date reali e
// vincoli dichiarati, e calcolo del percorso critico (CPM classico:
// avanzamento/ritorno sul grafo delle durate, non sulle date effettive —
// vedi nota sotto). Non sposta mai nessuna data da solo: segnala soltanto.
//
// Perché due calcoli distinti:
// - "vincoli violati" confronta le DATE REALI che l'utente ha scelto con
//   quello che la dipendenza dichiarata richiederebbe (la successora non
//   dovrebbe iniziare prima che la predecessora finisca + ritardo). Dice
//   "le date che hai messo non rispettano il legame che hai dichiarato".
// - "percorso critico" ignora le date reali e usa solo struttura del
//   grafo + durate (data_fine - data_inizio) per capire quale catena di
//   attività, se rallenta, fa slittare l'intera commessa — il percorso a
//   margine zero del Critical Path Method. Dice "questa è la sequenza che
//   conta di più", indipendentemente da eventuali sovrapposizioni nelle
//   date reali già segnalate come conflitto.

const db = require('../db/database');
const { daysBetween, addDays } = require('./dates');

function chiave(tipo, id) {
  return `${tipo}:${id}`;
}

// Carica tutte le attività con date valide (milestone e lavorazioni di
// primo livello o sotto-attività, tutte trattabili allo stesso modo qui)
// più gli archi di dipendenza della commessa.
function caricaGrafo(commessaId) {
  const milestoni = db.prepare('SELECT id, titolo, data_inizio, data_fine FROM milestone WHERE commessa_id = ?').all(commessaId);
  const lavorazioni = db.prepare('SELECT id, titolo, data_inizio, data_fine FROM lavorazioni WHERE commessa_id = ? AND data_inizio IS NOT NULL AND data_fine IS NOT NULL').all(commessaId);

  const nodi = new Map();
  milestoni.forEach((m) => nodi.set(chiave('milestone', m.id), { tipo: 'milestone', id: m.id, titolo: m.titolo, data_inizio: m.data_inizio, data_fine: m.data_fine }));
  lavorazioni.forEach((l) => nodi.set(chiave('lavorazione', l.id), { tipo: 'lavorazione', id: l.id, titolo: l.titolo, data_inizio: l.data_inizio, data_fine: l.data_fine }));

  const archi = db.prepare('SELECT * FROM timeline_dipendenze WHERE commessa_id = ?').all(commessaId)
    .map((r) => ({ ...r, predKey: chiave(r.pred_tipo, r.pred_id), succKey: chiave(r.succ_tipo, r.succ_id) }))
    .filter((a) => nodi.has(a.predKey) && nodi.has(a.succKey)); // scarta archi verso attività senza date valide

  return { nodi, archi };
}

// BFS da `daKey` seguendo gli archi in avanti (pred -> succ): true se
// `cercaKey` è raggiungibile. Usato per rifiutare un nuovo arco che
// chiuderebbe un ciclo, prima ancora di scriverlo.
function raggiungibile(archi, daKey, cercaKey) {
  const adiacenza = new Map();
  archi.forEach((a) => {
    if (!adiacenza.has(a.predKey)) adiacenza.set(a.predKey, []);
    adiacenza.get(a.predKey).push(a.succKey);
  });
  const visitati = new Set([daKey]);
  const coda = [daKey];
  while (coda.length) {
    const corrente = coda.shift();
    if (corrente === cercaKey) return true;
    for (const vicino of (adiacenza.get(corrente) || [])) {
      if (!visitati.has(vicino)) { visitati.add(vicino); coda.push(vicino); }
    }
  }
  return false;
}

// Vero se aggiungere l'arco predKey -> succKey chiuderebbe un ciclo: cioè
// se succKey può già raggiungere predKey seguendo gli archi esistenti.
function creerebbeCiclo(archi, predKey, succKey) {
  if (predKey === succKey) return true;
  return raggiungibile(archi, succKey, predKey);
}

// Ordinamento topologico (Kahn) — il grafo è garantito aciclico perché i
// cicli vengono rifiutati in scrittura, quindi termina sempre con tutti i
// nodi coinvolti in almeno un arco.
function ordineTopologico(nodiCoinvolti, archi) {
  const inDegree = new Map([...nodiCoinvolti].map((k) => [k, 0]));
  const adiacenza = new Map([...nodiCoinvolti].map((k) => [k, []]));
  archi.forEach((a) => {
    adiacenza.get(a.predKey).push(a);
    inDegree.set(a.succKey, (inDegree.get(a.succKey) || 0) + 1);
  });
  const coda = [...nodiCoinvolti].filter((k) => inDegree.get(k) === 0);
  const ordine = [];
  while (coda.length) {
    const k = coda.shift();
    ordine.push(k);
    (adiacenza.get(k) || []).forEach((a) => {
      inDegree.set(a.succKey, inDegree.get(a.succKey) - 1);
      if (inDegree.get(a.succKey) === 0) coda.push(a.succKey);
    });
  }
  return ordine;
}

// CPM: avanzamento (early start/finish) e ritorno (late start/finish) sul
// grafo durate+dipendenze; margine = lateStart - earlyStart; percorso
// critico = nodi/archi a margine zero. Lavora in giorni-offset relativi,
// non sulle date reali: vedi nota in testa al file.
function calcolaPercorsoCritico(nodi, archi) {
  const coinvolti = new Set();
  archi.forEach((a) => { coinvolti.add(a.predKey); coinvolti.add(a.succKey); });
  if (!coinvolti.size) return { nodiCritici: new Set(), archiCritici: new Set() };

  const ordine = ordineTopologico(coinvolti, archi);
  const durata = new Map([...coinvolti].map((k) => [k, Math.max(0, daysBetween(nodi.get(k).data_inizio, nodi.get(k).data_fine))]));
  const predecessoriDi = new Map([...coinvolti].map((k) => [k, []]));
  archi.forEach((a) => predecessoriDi.get(a.succKey).push(a));
  const successoriDi = new Map([...coinvolti].map((k) => [k, []]));
  archi.forEach((a) => successoriDi.get(a.predKey).push(a));

  const earlyStart = new Map();
  const earlyFinish = new Map();
  ordine.forEach((k) => {
    const preds = predecessoriDi.get(k);
    const es = preds.length ? Math.max(...preds.map((a) => earlyFinish.get(a.predKey) + a.ritardo_giorni)) : 0;
    earlyStart.set(k, Math.max(0, es));
    earlyFinish.set(k, earlyStart.get(k) + durata.get(k));
  });
  const projectFinish = Math.max(...[...coinvolti].map((k) => earlyFinish.get(k)));

  const lateFinish = new Map();
  const lateStart = new Map();
  [...ordine].reverse().forEach((k) => {
    const succ = successoriDi.get(k);
    const lf = succ.length ? Math.min(...succ.map((a) => lateStart.get(a.succKey) - a.ritardo_giorni)) : projectFinish;
    lateFinish.set(k, lf);
    lateStart.set(k, lf - durata.get(k));
  });

  const nodiCritici = new Set([...coinvolti].filter((k) => lateStart.get(k) - earlyStart.get(k) <= 0));
  const archiCritici = new Set(
    archi.filter((a) => nodiCritici.has(a.predKey) && nodiCritici.has(a.succKey)
      && earlyFinish.get(a.predKey) + a.ritardo_giorni === earlyStart.get(a.succKey))
      .map((a) => a.id)
  );
  return { nodiCritici, archiCritici };
}

// Scostamento fra le date reali e quanto richiesto dalla dipendenza: la
// successora dovrebbe iniziare non prima di (fine predecessora + ritardo).
function calcolaVincoliViolati(nodi, archi) {
  const violazioni = new Map();
  archi.forEach((a) => {
    const pred = nodi.get(a.predKey);
    const succ = nodi.get(a.succKey);
    const sogliaMinima = addDays(pred.data_fine, a.ritardo_giorni);
    if (succ.data_inizio < sogliaMinima) {
      violazioni.set(a.id, { giorniScostamento: daysBetween(succ.data_inizio, sogliaMinima) });
    }
  });
  return violazioni;
}

function calcolaSchedulazione(commessaId) {
  const { nodi, archi } = caricaGrafo(commessaId);
  const { nodiCritici, archiCritici } = calcolaPercorsoCritico(nodi, archi);
  const violazioni = calcolaVincoliViolati(nodi, archi);

  const archiRisolti = archi.map((a) => ({
    id: a.id,
    pred_tipo: a.pred_tipo, pred_id: a.pred_id, pred_titolo: nodi.get(a.predKey).titolo,
    succ_tipo: a.succ_tipo, succ_id: a.succ_id, succ_titolo: nodi.get(a.succKey).titolo,
    ritardo_giorni: a.ritardo_giorni,
    critica: archiCritici.has(a.id),
    violazione: violazioni.has(a.id),
    giorni_scostamento: violazioni.get(a.id)?.giorniScostamento ?? null,
  }));

  return {
    archi: archiRisolti,
    nodi_critici: [...nodiCritici],
  };
}

module.exports = { caricaGrafo, creerebbeCiclo, calcolaSchedulazione, chiave };
