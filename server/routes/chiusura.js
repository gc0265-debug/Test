const express = require('express');
const db = require('../db/database');

const router = express.Router();

// POST /api/chiusura — salva l'intero rituale di chiusura giornata in una transazione
router.post('/', (req, res) => {
  const { cantiere_id, date, weather, activities, notes, tags, presenze, spese, materiali, nc_riferimenti, tempi_montaggio } = req.body;
  if (!cantiere_id) return res.status(400).json({ error: 'cantiere_id è obbligatorio' });

  const today = new Date().toISOString().split('T')[0];

  const saveAll = db.transaction(() => {
    // 1. Crea o aggiorna il record giornale
    const existing = db.prepare('SELECT id FROM giornale WHERE cantiere_id = ? AND date = ?').get(cantiere_id, date || today);

    let giornaleId;
    if (existing) {
      db.prepare(`
        UPDATE giornale SET weather=?, activities=?, notes=?, tags=?, updated_at=unixepoch()
        WHERE id=?
      `).run(weather || 'sereno', activities || null, notes || null, JSON.stringify(tags || []), existing.id);
      giornaleId = existing.id;
    } else {
      const r = db.prepare(`
        INSERT INTO giornale (cantiere_id, date, weather, activities, notes, tags)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(cantiere_id, date || today, weather || 'sereno', activities || null, notes || null, JSON.stringify(tags || []));
      giornaleId = r.lastInsertRowid;
    }

    // 2. Presenze — rimpiazza tutte quelle del giorno
    db.prepare('DELETE FROM presenze WHERE giornale_id = ?').run(giornaleId);
    const insertPresenza = db.prepare(`
      INSERT INTO presenze (giornale_id, persona, impresa, zona, attivita, ora_entrata, ora_uscita, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of (presenze || [])) {
      insertPresenza.run(giornaleId, p.persona, p.impresa || null, p.zona || null, p.attivita || null, p.ora_entrata || null, p.ora_uscita || null, p.note || null);
    }

    // 3. Spese — rimpiazza
    db.prepare('DELETE FROM spese WHERE giornale_id = ?').run(giornaleId);
    const insertSpesa = db.prepare(`
      INSERT INTO spese (giornale_id, descrizione, importo, categoria, fornitore, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const s of (spese || [])) {
      insertSpesa.run(giornaleId, s.descrizione, s.importo || 0, s.categoria || 'altro', s.fornitore || null, s.note || null);
    }

    // 4. Materiali — rimpiazza
    db.prepare('DELETE FROM materiali WHERE giornale_id = ?').run(giornaleId);
    const insertMateriale = db.prepare(`
      INSERT INTO materiali (giornale_id, descrizione, quantita, unita, fornitore, conforme, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of (materiali || [])) {
      insertMateriale.run(giornaleId, m.descrizione, m.quantita || null, m.unita || null, m.fornitore || null, m.conforme !== false ? 1 : 0, m.note || null);
    }

    // 5. NC riferimenti — rimpiazza
    db.prepare('DELETE FROM nc_riferimenti WHERE giornale_id = ?').run(giornaleId);
    const insertNC = db.prepare(`
      INSERT INTO nc_riferimenti (giornale_id, codice_nc, link_esterno, descrizione, stato, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const nc of (nc_riferimenti || [])) {
      insertNC.run(giornaleId, nc.codice_nc || null, nc.link_esterno || null, nc.descrizione, nc.stato || 'aperta', nc.note || null);
    }

    // 6. Tempi montaggio — aggiunge (non rimpiazza, sono KPI storici)
    const insertTempo = db.prepare(`
      INSERT INTO tempi_montaggio (giornale_id, lavorazione_id, tipo_arredo, quantita, durata_minuti, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const t of (tempi_montaggio || [])) {
      insertTempo.run(giornaleId, t.lavorazione_id || null, t.tipo_arredo, t.quantita || 1, t.durata_minuti, t.note || null);
    }

    return giornaleId;
  });

  const giornaleId = saveAll();
  const giornale = db.prepare('SELECT * FROM giornale WHERE id = ?').get(giornaleId);
  res.status(201).json({ giornale_id: giornaleId, data: giornale });
});

// GET /api/chiusura/:giornale_id — recupera rituale completo per un giorno
router.get('/:giornale_id', (req, res) => {
  const { giornale_id } = req.params;
  const giornale = db.prepare(`
    SELECT g.*, c.title as cantiere_name
    FROM giornale g LEFT JOIN cantieri c ON g.cantiere_id = c.id
    WHERE g.id = ?
  `).get(giornale_id);
  if (!giornale) return res.status(404).json({ error: 'Not found' });

  res.json({
    giornale,
    presenze: db.prepare('SELECT * FROM presenze WHERE giornale_id = ? ORDER BY created_at').all(giornale_id),
    spese: db.prepare('SELECT * FROM spese WHERE giornale_id = ? ORDER BY created_at').all(giornale_id),
    materiali: db.prepare('SELECT * FROM materiali WHERE giornale_id = ? ORDER BY created_at').all(giornale_id),
    nc_riferimenti: db.prepare('SELECT * FROM nc_riferimenti WHERE giornale_id = ? ORDER BY created_at').all(giornale_id),
    tempi_montaggio: db.prepare('SELECT * FROM tempi_montaggio WHERE giornale_id = ? ORDER BY created_at').all(giornale_id),
  });
});

module.exports = router;
