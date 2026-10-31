// Report configurabili: una selezione salvata di sezioni (registri),
// filtrabile per Work Package e periodo, rigenerabile in PDF/Word/Excel o
// inviabile via email — vedi server/utils/reportSezioni.js (dati) e
// server/utils/reportFile.js (i tre formati).

const express = require('express');
const db = require('../db/database');
const { elencoSezioni, raccogliDati } = require('../utils/reportSezioni');
const { generaPdfBuffer, generaDocxBuffer, generaXlsxBuffer } = require('../utils/reportFile');
const { inviaEmail } = require('../utils/mailer');

const router = express.Router();

function parseSezioni(raw) {
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

router.get('/sezioni', (req, res) => {
  res.json({ data: elencoSezioni() });
});

router.get('/', (req, res) => {
  const { commessa_id } = req.query;
  if (!commessa_id) return res.status(400).json({ error: 'commessa_id obbligatorio' });
  const rows = db.prepare(`
    SELECT rc.*, w.codice AS wp_codice, w.nome AS wp_nome FROM report_config rc
    LEFT JOIN work_packages w ON rc.wp_id = w.id
    WHERE rc.commessa_id = ? ORDER BY rc.nome ASC
  `).all(commessa_id).map((r) => ({ ...r, sezioni: parseSezioni(r.sezioni) }));
  res.json({ data: rows, total: rows.length });
});

router.post('/', (req, res) => {
  const { commessa_id, nome, sezioni, wp_id, periodo_da, periodo_a } = req.body;
  if (!commessa_id || !nome) return res.status(400).json({ error: 'commessa_id e nome sono obbligatori' });
  if (!Array.isArray(sezioni) || !sezioni.length) return res.status(400).json({ error: 'seleziona almeno una sezione' });

  const result = db.prepare(`
    INSERT INTO report_config (commessa_id, nome, sezioni, wp_id, periodo_da, periodo_a)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(commessa_id, nome, JSON.stringify(sezioni), wp_id || null, periodo_da || null, periodo_a || null);
  const row = db.prepare('SELECT * FROM report_config WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, sezioni: parseSezioni(row.sezioni) });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM report_config WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'report non trovato' });
  const { nome, sezioni, wp_id, periodo_da, periodo_a } = req.body;
  if (!Array.isArray(sezioni) || !sezioni.length) return res.status(400).json({ error: 'seleziona almeno una sezione' });

  db.prepare(`
    UPDATE report_config SET nome=?, sezioni=?, wp_id=?, periodo_da=?, periodo_a=?, updated_at=unixepoch() WHERE id=?
  `).run(nome ?? existing.nome, JSON.stringify(sezioni), wp_id || null, periodo_da || null, periodo_a || null, req.params.id);
  const row = db.prepare('SELECT * FROM report_config WHERE id = ?').get(req.params.id);
  res.json({ ...row, sezioni: parseSezioni(row.sezioni) });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM report_config WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'report non trovato' });
  res.status(204).end();
});

// Prepara {nome, commessa, sezioniDati, filtri} per i generatori di file,
// condiviso dai tre export e dall'invio email.
function preparaDatiReport(id) {
  const config = db.prepare('SELECT * FROM report_config WHERE id = ?').get(id);
  if (!config) return null;
  const commessa = db.prepare('SELECT * FROM commesse WHERE id = ?').get(config.commessa_id);
  const wp = config.wp_id ? db.prepare('SELECT * FROM work_packages WHERE id = ?').get(config.wp_id) : null;
  const filtri = { wpId: config.wp_id, wpLabel: wp ? `${wp.codice} ${wp.nome}` : null, periodoDa: config.periodo_da, periodoA: config.periodo_a };
  const sezioniDati = raccogliDati(config.commessa_id, parseSezioni(config.sezioni), filtri);
  return { nome: config.nome, commessa, sezioniDati, filtri };
}

function nomeFile(nome, estensione) {
  const pulito = nome.replace(/[^a-z0-9 _-]+/gi, '').trim().replace(/\s+/g, '_') || 'report';
  return `${pulito}.${estensione}`;
}

router.get('/:id/pdf', async (req, res) => {
  const dati = preparaDatiReport(req.params.id);
  if (!dati) return res.status(404).json({ error: 'report non trovato' });
  try {
    const buffer = await generaPdfBuffer(dati);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeFile(dati.nome, 'pdf')}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: `generazione PDF fallita: ${err.message}` });
  }
});

router.get('/:id/docx', async (req, res) => {
  const dati = preparaDatiReport(req.params.id);
  if (!dati) return res.status(404).json({ error: 'report non trovato' });
  try {
    const buffer = await generaDocxBuffer(dati);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeFile(dati.nome, 'docx')}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: `generazione Word fallita: ${err.message}` });
  }
});

router.get('/:id/xlsx', async (req, res) => {
  const dati = preparaDatiReport(req.params.id);
  if (!dati) return res.status(404).json({ error: 'report non trovato' });
  try {
    const buffer = await generaXlsxBuffer(dati);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeFile(dati.nome, 'xlsx')}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: `generazione Excel fallita: ${err.message}` });
  }
});

router.post('/:id/email', async (req, res) => {
  const dati = preparaDatiReport(req.params.id);
  if (!dati) return res.status(404).json({ error: 'report non trovato' });
  const { destinatari, formati } = req.body;
  const elencoDestinatari = (Array.isArray(destinatari) ? destinatari : String(destinatari || '').split(','))
    .map((s) => s.trim()).filter(Boolean);
  if (!elencoDestinatari.length) return res.status(400).json({ error: 'indica almeno un indirizzo email' });
  const elencoFormati = Array.isArray(formati) && formati.length ? formati : ['pdf'];

  try {
    const generatori = { pdf: generaPdfBuffer, docx: generaDocxBuffer, xlsx: generaXlsxBuffer };
    const mime = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const attachments = await Promise.all(elencoFormati.map(async (f) => ({
      filename: nomeFile(dati.nome, f), content: await generatori[f](dati), contentType: mime[f],
    })));

    await inviaEmail({
      to: elencoDestinatari,
      subject: `${dati.nome} — ${dati.commessa.codice}`,
      html: `<p>In allegato il report <b>${dati.nome}</b> della commessa ${dati.commessa.codice} — ${dati.commessa.nome}, generato il ${new Date().toLocaleDateString('it-IT')}.</p>`,
      attachments,
    });
    res.json({ ok: true, destinatari: elencoDestinatari });
  } catch (err) {
    const status = err.code === 'SMTP_NOT_CONFIGURED' ? 503 : 502;
    res.status(status).json({ error: err.message, code: err.code });
  }
});

module.exports = router;
