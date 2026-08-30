// Data e ora nel fuso del cantiere.
//
// Railway gira in UTC: usare toISOString() per sapere "che giorno è" sposta la
// giornata di un'ora o due. Alle 00:30 italiane in UTC è ancora il giorno prima,
// e una chiusura registrata a tarda sera finirebbe sulla data sbagliata.
// Tutto ciò che dipende dal calendario passa da qui.

const ZONA = process.env.TZ_APP || 'Europe/Rome';

const fmtDataOra = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

const fmtGiorno = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, weekday: 'short' });

function parti(d = new Date()) {
  const p = fmtDataOra.formatToParts(d).reduce((acc, x) => {
    acc[x.type] = x.value;
    return acc;
  }, {});
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    ora: `${p.hour}:${p.minute}`,
    giorno: fmtGiorno.format(d),
  };
}

const oggi = (d) => parti(d).data;
const oraCorrente = (d) => parti(d).ora;
const isWeekend = (d) => ['Sat', 'Sun'].includes(parti(d).giorno);

module.exports = { oggi, oraCorrente, isWeekend, parti, ZONA };
