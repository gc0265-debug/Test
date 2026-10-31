// Invio email via SMTP (nodemailer), configurato interamente da
// variabili d'ambiente (vedi .env.example). Usato dalle notifiche di
// scadenza e dal pulsante "Invia notifica di prova" in Commesse.
let nodemailer;
try { nodemailer = require('nodemailer'); } catch { nodemailer = null; }

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!nodemailer || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

function configurato() {
  return !!getTransporter();
}

async function inviaEmail({ to, subject, html, text, attachments }) {
  const t = getTransporter();
  if (!t) {
    const err = new Error('SMTP non configurato sul server: imposta SMTP_HOST, SMTP_USER e SMTP_PASS nel file .env (vedi .env.example).');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const destinatari = Array.isArray(to) ? to.join(', ') : to;
  await t.sendMail({ from, to: destinatari, subject, html, text, attachments });
}

module.exports = { configurato, inviaEmail };
