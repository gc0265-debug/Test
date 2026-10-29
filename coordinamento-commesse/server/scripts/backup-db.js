#!/usr/bin/env node
// Backup cifrato del database — vedi GUIDA_AGGIORNAMENTI.md per
// l'installazione (deploy/macos/installa-backup-automatico.command).
//
// node scripts/backup-db.js            esegue un backup ora
// node scripts/backup-db.js --verify    decifra l'ultimo backup e ne
//                                       controlla l'integrità, senza
//                                       toccare il database reale
//
// Il backup è una copia consistente del database (API di backup nativa
// di better-sqlite3, sicura anche a server acceso) cifrata con
// AES-256-GCM. La chiave vive in server/.backup-key (esclusa da git,
// permessi 600): se il Mac va perso insieme al file, i backup restano
// illeggibili, perciò l'installer la stampa una volta sola invitando a
// conservarne una copia altrove (es. un password manager).

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const SERVER_DIR = path.join(__dirname, '..');
const DB_PATH = process.env.DATABASE_PATH || path.join(SERVER_DIR, 'coordinamento.db');
const KEY_PATH = path.join(SERVER_DIR, '.backup-key');
const CONFIG_PATH = path.join(SERVER_DIR, 'backup-config.json');
const RETENTION_DAYS = 60;
const PREFIX = 'coordinamento-';
const SUFFIX = '.db.enc';

function getOrCreateKey() {
  if (fs.existsSync(KEY_PATH)) return fs.readFileSync(KEY_PATH);
  const key = crypto.randomBytes(32);
  fs.writeFileSync(KEY_PATH, key, { mode: 0o600 });
  return key;
}

function getDestDir() {
  if (process.env.BACKUP_DIR) return process.env.BACKUP_DIR;
  if (fs.existsSync(CONFIG_PATH)) {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (cfg.destDir) return cfg.destDir;
  }
  throw new Error('Nessuna cartella di destinazione configurata. Esegui prima installa-backup-automatico.command.');
}

async function creaBackup() {
  const key = getOrCreateKey();
  const destDir = getDestDir();
  fs.mkdirSync(destDir, { recursive: true });

  if (!fs.existsSync(DB_PATH)) throw new Error(`Database non trovato: ${DB_PATH}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tmpPath = path.join(os.tmpdir(), `coordinamento-backup-${stamp}.db`);

  const db = new Database(DB_PATH, { readonly: true });
  await db.backup(tmpPath);
  db.close();

  const plain = fs.readFileSync(tmpPath);
  fs.unlinkSync(tmpPath);

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const outPath = path.join(destDir, `${PREFIX}${stamp}${SUFFIX}`);
  fs.writeFileSync(outPath, Buffer.concat([iv, authTag, encrypted]));

  pulisciVecchi(destDir);
  console.log(`[${new Date().toISOString()}] Backup completato: ${outPath} (${(encrypted.length / 1024 / 1024).toFixed(1)} MB)`);
  return outPath;
}

function pulisciVecchi(destDir) {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  fs.readdirSync(destDir).forEach((name) => {
    if (!name.startsWith(PREFIX) || !name.endsWith(SUFFIX)) return;
    const full = path.join(destDir, name);
    if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
  });
}

function decifra(filePath, outPath) {
  const key = getOrCreateKey();
  const raw = fs.readFileSync(filePath);
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  fs.writeFileSync(outPath, plain);
}

function ultimoBackup(destDir) {
  const files = fs.readdirSync(destDir).filter((f) => f.startsWith(PREFIX) && f.endsWith(SUFFIX));
  if (!files.length) throw new Error(`Nessun backup trovato in ${destDir}`);
  files.sort();
  return path.join(destDir, files[files.length - 1]);
}

function verifica() {
  const destDir = getDestDir();
  const filePath = ultimoBackup(destDir);
  const tmpPath = path.join(os.tmpdir(), `coordinamento-verifica-${Date.now()}.db`);
  try {
    decifra(filePath, tmpPath);
  } catch (err) {
    throw new Error(`Il backup non si decifra (file corrotto o chiave diversa): ${err.message}`);
  }
  const db = new Database(tmpPath, { readonly: true });
  const integrity = db.prepare('PRAGMA integrity_check').get();
  const nCommesse = db.prepare('SELECT COUNT(*) AS n FROM commesse').get().n;
  const nUsers = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  db.close();
  fs.unlinkSync(tmpPath);
  if (integrity.integrity_check !== 'ok') {
    throw new Error(`Controllo integrità fallito su ${filePath}: ${integrity.integrity_check}`);
  }
  console.log(`[${new Date().toISOString()}] Verifica OK — ${filePath}`);
  console.log(`  integrity_check: ok · commesse: ${nCommesse} · utenti: ${nUsers}`);
}

const mode = process.argv[2];
(async () => {
  try {
    if (mode === '--verify') verifica();
    else await creaBackup();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERRORE: ${err.message}`);
    process.exitCode = 1;
  }
})();
