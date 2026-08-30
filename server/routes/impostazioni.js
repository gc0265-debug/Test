const express = require('express');
const { leggiTutte, scrivi } = require('../services/impostazioniService');
const { ZONA, oggi, oraCorrente } = require('../services/tempo');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    dati: leggiTutte(),
    // Utile a colpo d'occhio: dice se il server sta ragionando sul fuso giusto
    fuso: { zona: ZONA, data: oggi(), ora: oraCorrente() },
  });
});

router.put('/', (req, res) => {
  const { errore, dati } = scrivi(req.body || {});
  if (errore) return res.status(400).json({ error: errore });
  res.json({ dati });
});

module.exports = router;
