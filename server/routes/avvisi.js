const express = require('express');
const { calcolaAvvisi } = require('../services/avvisiService');

const router = express.Router();

router.get('/', (req, res) => {
  const avvisi = calcolaAvvisi();
  res.json({ data: avvisi, total: avvisi.length });
});

module.exports = router;
