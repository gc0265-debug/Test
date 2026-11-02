const express = require('express');
const multer = require('multer');
const db = require('../db/database');
const { logAudit, diffFields } = require('../utils/audit');
const { applicaFiltroCommessa } = require('../utils/scopeCommessa');
const { verificaVersione } = require('../utils/concorrenza');
const { parseCsv, normalizzaTestoCsv, mappaColonne } = require('../utils/csv');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const TRACKED = [
  { key: 'nome', label: 'Nome' },
  { key: 'organizzazione', label: 'Organizzazione' },
  { key: 'ruolo', label: 'Ruolo' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'interesse', label: 'Interesse' },
  { key: 'influenza', label: 'Influenza' },
  { key: 'stato', label: 'Stato' },
];

router.get('/', (req, res) => {
  const { categoria, stato } = req.query;
  let sql = `
    SELECT s.*, cm.codice AS commessa_codice
    FROM stakeholder s
    LEFT JOIN commesse cm ON s.commessa_id = cm.id
    WHERE 1=1
  `;
  const params = [];
  sql = applicaFiltroCommessa(sql, params, req.query, 's.commessa_id');
  if (categoria) { sql += ' AND categoria = ?'; params.push(categoria); }
  if (stato) { sql += ' AND stato = ?'; params.push(stato); }
  sql += ' ORDER BY nome ASC';
  res.json({ data: db.prepare(sql).all(...params), total: 0 });
});

router.post('/', (req, res) => {
  const { commessa_id, nome, organizzazione, ruolo, categoria, interesse, influenza, email, telefono, stato, note } = req.body;
  if (!commessa_id || !nome) return res.status(400).json({ error: 'commessa_id e nome sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO stakeholder (commessa_id, nome, organizzazione, ruolo, categoria, interesse, influenza, email, telefono, stato, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    commessa_id, nome, organizzazione || null, ruolo || null, categoria || 'interno',
    interesse || 'medio', influenza || 'media', email || null, telefono || null, stato || 'attivo', note || null
  );
  const row = db.prepare('SELECT * FROM stakeholder WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'stakeholder', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: nome });
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM stakeholder WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'stakeholder non trovato' });
  if (!verificaVersione(req, res, existing)) return;
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE stakeholder SET nome=?, organizzazione=?, ruolo=?, categoria=?, interesse=?, influenza=?, email=?, telefono=?, stato=?, note=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    next.nome, next.organizzazione || null, next.ruolo || null, next.categoria, next.interesse, next.influenza,
    next.email || null, next.telefono || null, next.stato, next.note || null, req.params.id
  );
  const row = db.prepare('SELECT * FROM stakeholder WHERE id = ?').get(req.params.id);
  const dettaglio = diffFields(existing, next, TRACKED);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'stakeholder', entity_id: row.id, azione: 'modificata', utente: req.user?.nome, dettaglio: dettaglio || 'aggiornato' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM stakeholder WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'stakeholder non trovato' });
  db.prepare('DELETE FROM stakeholder WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: existing.commessa_id, entity_type: 'stakeholder', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: existing.nome });
  res.status(204).end();
});

// Import in blocco da CSV: intestazioni Nome, Organizzazione, Ruolo,
// Categoria, Interesse, Influenza, Email, Telefono, Stato, Note.
const ALIAS_COLONNE_STAKEHOLDER = {
  nome: ['nome', 'referente', 'contatto'],
  organizzazione: ['organizzazione', 'azienda', 'società', 'ditta'],
  ruolo: ['ruolo'],
  categoria: ['categoria'],
  interesse: ['interesse'],
  influenza: ['influenza'],
  email: ['email', 'e-mail', 'posta elettronica'],
  telefono: ['telefono', 'cellulare', 'tel'],
  stato: ['stato'],
  note: ['note'],
};
const INTERESSE_ALIAS = { basso: 'basso', '': 'medio', medio: 'medio', alto: 'alto' };
const INFLUENZA_ALIAS = { bassa: 'bassa', '': 'media', media: 'media', alta: 'alta' };
const STATO_ALIAS_STAKEHOLDER = { attivo: 'attivo', '': 'attivo', 'non attivo': 'non-attivo', 'non-attivo': 'non-attivo', inattivo: 'non-attivo' };

router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'nessun file caricato' });
  const commessaId = req.body.commessa_id;
  if (!commessaId) return res.status(400).json({ error: 'commessa_id obbligatorio' });

  let righe;
  try { righe = parseCsv(req.file.buffer.toString('utf8')); }
  catch (err) { return res.status(400).json({ error: 'file CSV non leggibile' }); }
  if (!righe.length) return res.status(400).json({ error: 'il file è vuoto' });

  const colIndex = mappaColonne(righe[0], ALIAS_COLONNE_STAKEHOLDER);
  if (colIndex.nome === undefined) {
    return res.status(400).json({ error: 'non trovo una colonna "Nome" nel file: le intestazioni attese sono Nome, Organizzazione, Ruolo, Categoria, Interesse, Influenza, Email, Telefono, Stato, Note' });
  }
  const cella = (riga, campo) => (colIndex[campo] !== undefined ? String(riga[colIndex[campo]] || '').trim() : '');

  const insert = db.prepare(`
    INSERT INTO stakeholder (commessa_id, nome, organizzazione, ruolo, categoria, interesse, influenza, email, telefono, stato, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  const skippedMotivi = [];
  db.transaction(() => {
    for (let r = 1; r < righe.length; r++) {
      const riga = righe[r];
      const numeroRiga = r + 1;
      const nome = cella(riga, 'nome');
      if (!nome) { skippedMotivi.push(`riga ${numeroRiga}: manca il nome`); continue; }

      const result = insert.run(
        commessaId, nome, cella(riga, 'organizzazione') || null, cella(riga, 'ruolo') || null,
        cella(riga, 'categoria') || 'interno',
        INTERESSE_ALIAS[normalizzaTestoCsv(cella(riga, 'interesse'))] || 'medio',
        INFLUENZA_ALIAS[normalizzaTestoCsv(cella(riga, 'influenza'))] || 'media',
        cella(riga, 'email') || null, cella(riga, 'telefono') || null,
        STATO_ALIAS_STAKEHOLDER[normalizzaTestoCsv(cella(riga, 'stato'))] || 'attivo', cella(riga, 'note') || null
      );
      logAudit({ commessa_id: commessaId, entity_type: 'stakeholder', entity_id: result.lastInsertRowid, azione: 'creata', utente: req.user?.nome, dettaglio: `${nome} (import)` });
      imported++;
    }
  })();

  res.status(201).json({ imported, skipped: skippedMotivi.length, dettaglioScarti: skippedMotivi.slice(0, 30) });
});

module.exports = router;
