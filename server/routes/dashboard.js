const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const counts = {
    projects: db.prepare("SELECT COUNT(*) as n FROM projects WHERE status = 'active'").get().n,
    areas: db.prepare('SELECT COUNT(*) as n FROM areas').get().n,
    resources: db.prepare('SELECT COUNT(*) as n FROM resources').get().n,
    archives: db.prepare('SELECT COUNT(*) as n FROM archives').get().n,
  };

  const activeProjects = db.prepare(
    "SELECT * FROM projects WHERE status = 'active' ORDER BY created_at DESC LIMIT 5"
  ).all();

  const recentArchives = db.prepare(
    'SELECT * FROM archives ORDER BY archived_at DESC LIMIT 5'
  ).all();

  res.json({ counts, activeProjects, recentArchives });
});

module.exports = router;
