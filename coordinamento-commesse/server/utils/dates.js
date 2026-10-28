// Giorni interi fra due date YYYY-MM-DD (b - a). Positivo se b è nel futuro
// rispetto ad a. Usa mezzanotte UTC per entrambe, così il conteggio non
// dipende dal fuso del server.
function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00Z');
  const db_ = new Date(b + 'T00:00:00Z');
  return Math.round((db_.getTime() - da.getTime()) / 86400000);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Somma (o sottrae, con n negativo) n giorni a una data YYYY-MM-DD.
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

module.exports = { daysBetween, todayStr, addDays };
