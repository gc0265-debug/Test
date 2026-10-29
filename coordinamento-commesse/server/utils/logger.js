// Logger minimo su file, un file per giorno (rotazione naturale per
// nome file), con pulizia automatica dei log più vecchi di 30 giorni.
// Non sostituisce console.log/error — che launchd cattura già in
// server/logs/out.log ed err.log — ma aggiunge un registro strutturato
// e interrogabile per gli eventi di sicurezza (login falliti, rate
// limit) e gli errori applicativi.

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const RETENTION_DAYS = 30;

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function todayFile() {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return path.join(LOG_DIR, `app-${date}.log`);
}

function write(level, message, meta) {
  try {
    ensureDir();
    const line = JSON.stringify({ t: new Date().toISOString(), level, message, ...meta }) + '\n';
    fs.appendFileSync(todayFile(), line);
  } catch (_) {
    // un errore di log non deve mai far cadere il processo
  }
}

function pruneOldLogs() {
  try {
    ensureDir();
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    fs.readdirSync(LOG_DIR).forEach((name) => {
      if (!name.startsWith('app-') || !name.endsWith('.log')) return;
      const full = path.join(LOG_DIR, name);
      if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
    });
  } catch (_) {
    // pulizia best-effort, non critica
  }
}
pruneOldLogs();

module.exports = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
