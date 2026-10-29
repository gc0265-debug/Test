// Contratto — baseline del capitolato (data) e procedura di change
// management concordata in fase di stipula. /:id/variazioni confronta
// le versioni dei requisiti della stessa commessa con quella baseline:
// ogni versione successiva è una variazione da gestire.

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db/database');
const { logAudit } = require('../utils/audit');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

router.get('/', (req, res) => {
  const { commessa_id } = req.query;
  let sql = 'SELECT * FROM contratti WHERE 1=1';
  const params = [];
  if (commessa_id) { sql += ' AND commessa_id = ?'; params.push(commessa_id); }
  sql += ' ORDER BY data_stipula DESC';
  res.json({ data: db.prepare(sql).all(...params), total: 0 });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM contratti WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'contratto non trovato' });
  res.json(row);
});

// Variazioni: versioni dei requisiti della stessa commessa successive
// alla baseline del contratto (o a quella dell'ultima volta che sono
// state "gestite", se il body di un futuro PUT la aggiornasse — oggi
// confronta sempre con capitolato_baseline_data).
router.get('/:id/variazioni', (req, res) => {
  const contratto = db.prepare('SELECT * FROM contratti WHERE id = ?').get(req.params.id);
  if (!contratto) return res.status(404).json({ error: 'contratto non trovato' });
  if (!contratto.capitolato_baseline_data) return res.json({ data: [] });

  const rows = db.prepare(`
    SELECT rv.id AS versione_id, rv.numero_versione, rv.titolo, rv.descrizione, rv.motivo_modifica, rv.data, rv.autore,
           r.id AS requisito_id, r.codice_wbs, r.fase
    FROM requisiti_versioni rv
    JOIN requisiti r ON rv.requisito_id = r.id
    WHERE r.commessa_id = ? AND rv.data > ? AND rv.numero_versione > 1
    ORDER BY rv.data DESC
  `).all(contratto.commessa_id, contratto.capitolato_baseline_data);
  res.json({ data: rows });
});

router.post('/', upload.single('file'), (req, res) => {
  const { commessa_id, titolo, controparte, data_stipula, valore, riferimento_capitolato,
          capitolato_baseline_data, procedura_change_management, stato, url, note } = req.body;
  if (!commessa_id || !titolo) return res.status(400).json({ error: 'commessa_id e titolo sono obbligatori' });
  const file = req.file;
  const result = db.prepare(`
    INSERT INTO contratti (commessa_id, titolo, controparte, data_stipula, valore, riferimento_capitolato,
      capitolato_baseline_data, procedura_change_management, stato, url, note, file_nome, file_path, file_mime, file_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    commessa_id, titolo, controparte || null, data_stipula || null, valore ? Number(valore) : null,
    riferimento_capitolato || null, capitolato_baseline_data || null, procedura_change_management || null,
    stato || 'attivo', url || null, note || null,
    file ? file.originalname : null, file ? file.filename : null, file ? file.mimetype : null, file ? file.size : null
  );
  const row = db.prepare('SELECT * FROM contratti WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'contratti', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: titolo });
  res.status(201).json(row);
});

router.put('/:id', upload.single('file'), (req, res) => {
  const existing = db.prepare('SELECT * FROM contratti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'contratto non trovato' });
  const b = req.body;
  const file = req.file;
  if ((file || b.rimuovi_file === '1') && existing.file_path) fs.unlink(path.join(uploadDir, existing.file_path), () => {});

  const next = {
    titolo: b.titolo ?? existing.titolo,
    controparte: b.controparte !== undefined ? (b.controparte || null) : existing.controparte,
    data_stipula: b.data_stipula !== undefined ? (b.data_stipula || null) : existing.data_stipula,
    valore: b.valore !== undefined ? (b.valore ? Number(b.valore) : null) : existing.valore,
    riferimento_capitolato: b.riferimento_capitolato !== undefined ? (b.riferimento_capitolato || null) : existing.riferimento_capitolato,
    capitolato_baseline_data: b.capitolato_baseline_data !== undefined ? (b.capitolato_baseline_data || null) : existing.capitolato_baseline_data,
    procedura_change_management: b.procedura_change_management !== undefined ? (b.procedura_change_management || null) : existing.procedura_change_management,
    stato: b.stato || existing.stato,
    url: b.url !== undefined ? (b.url || null) : existing.url,
    note: b.note !== undefined ? (b.note || null) : existing.note,
    file_nome: file ? file.originalname : (b.rimuovi_file === '1' ? null : existing.file_nome),
    file_path: file ? file.filename : (b.rimuovi_file === '1' ? null : existing.file_path),
    file_mime: file ? file.mimetype : (b.rimuovi_file === '1' ? null : existing.file_mime),
    file_size: file ? file.size : (b.rimuovi_file === '1' ? null : existing.file_size),
  };

  db.prepare(`
    UPDATE contratti SET titolo=?, controparte=?, data_stipula=?, valore=?, riferimento_capitolato=?,
      capitolato_baseline_data=?, procedura_change_management=?, stato=?, url=?, note=?,
      file_nome=?, file_path=?, file_mime=?, file_size=?, updated_at=unixepoch()
    WHERE id=?
  `).run(
    next.titolo, next.controparte, next.data_stipula, next.valore, next.riferimento_capitolato,
    next.capitolato_baseline_data, next.procedura_change_management, next.stato, next.url, next.note,
    next.file_nome, next.file_path, next.file_mime, next.file_size, req.params.id
  );
  const row = db.prepare('SELECT * FROM contratti WHERE id = ?').get(req.params.id);
  logAudit({ commessa_id: row.commessa_id, entity_type: 'contratti', entity_id: row.id, azione: 'modificata', utente: req.user?.nome, dettaglio: 'aggiornato' });
  res.json(row);
});

// ---- atti aggiuntivi: varianti/integrazioni economiche al contratto ----
router.get('/:id/atti', (req, res) => {
  const rows = db.prepare('SELECT * FROM atti_aggiuntivi WHERE contratto_id = ? ORDER BY data ASC, id ASC').all(req.params.id);
  res.json({ data: rows });
});

router.post('/:id/atti', (req, res) => {
  const contratto = db.prepare('SELECT * FROM contratti WHERE id = ?').get(req.params.id);
  if (!contratto) return res.status(404).json({ error: 'contratto non trovato' });
  const { titolo, data, valore, descrizione, note } = req.body;
  if (!titolo) return res.status(400).json({ error: 'titolo obbligatorio' });
  const result = db.prepare(`
    INSERT INTO atti_aggiuntivi (contratto_id, titolo, data, valore, descrizione, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.id, titolo, data || null, Number(valore) || 0, descrizione || null, note || null);
  const row = db.prepare('SELECT * FROM atti_aggiuntivi WHERE id = ?').get(result.lastInsertRowid);
  logAudit({ commessa_id: contratto.commessa_id, entity_type: 'atti_aggiuntivi', entity_id: row.id, azione: 'creata', utente: req.user?.nome, dettaglio: `${titolo} (${contratto.titolo})` });
  res.status(201).json(row);
});

router.put('/atti/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM atti_aggiuntivi WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'atto aggiuntivo non trovato' });
  const next = { ...existing, ...req.body };
  db.prepare(`
    UPDATE atti_aggiuntivi SET titolo=?, data=?, valore=?, descrizione=?, note=?, updated_at=unixepoch() WHERE id=?
  `).run(next.titolo, next.data || null, Number(next.valore) || 0, next.descrizione || null, next.note || null, req.params.id);
  const row = db.prepare('SELECT * FROM atti_aggiuntivi WHERE id = ?').get(req.params.id);
  const contratto = db.prepare('SELECT * FROM contratti WHERE id = ?').get(row.contratto_id);
  logAudit({ commessa_id: contratto.commessa_id, entity_type: 'atti_aggiuntivi', entity_id: row.id, azione: 'modificata', utente: req.user?.nome, dettaglio: row.titolo });
  res.json(row);
});

router.delete('/atti/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM atti_aggiuntivi WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'atto aggiuntivo non trovato' });
  const contratto = db.prepare('SELECT * FROM contratti WHERE id = ?').get(existing.contratto_id);
  db.prepare('DELETE FROM atti_aggiuntivi WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: contratto?.commessa_id, entity_type: 'atti_aggiuntivi', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: existing.titolo });
  res.status(204).end();
});

router.get('/:id/file', (req, res) => {
  const row = db.prepare('SELECT * FROM contratti WHERE id = ?').get(req.params.id);
  if (!row || !row.file_path) return res.status(404).json({ error: 'nessun file allegato' });
  const filePath = path.join(uploadDir, row.file_path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'file non trovato sul server' });
  res.download(filePath, row.file_nome || row.file_path);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM contratti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'contratto non trovato' });
  if (existing.file_path) fs.unlink(path.join(uploadDir, existing.file_path), () => {});
  db.prepare('DELETE FROM contratti WHERE id = ?').run(req.params.id);
  logAudit({ commessa_id: existing.commessa_id, entity_type: 'contratti', entity_id: existing.id, azione: 'eliminata', utente: req.user?.nome, dettaglio: existing.titolo });
  res.status(204).end();
});

module.exports = router;
