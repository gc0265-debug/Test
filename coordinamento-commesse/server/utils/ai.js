// Generazione ragionata (non un semplice copia-incolla dai registri) del
// contenuto delle Lezioni Apprese, tramite l'API di Claude (Anthropic).
// Richiede la variabile d'ambiente ANTHROPIC_API_KEY (vedi .env.example):
// se assente, il chiamante deve mostrare un messaggio chiaro invece di
// inventare un fallback locale che finirebbe per essere, di nuovo, un
// testo semplicemente ricopiato dai campi del registro.

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

const SYSTEM_PROMPT = `Sei un assistente che aiuta un Direttore di Cantiere di un'azienda di coordinamento per allestimenti su misura in hotel di lusso, ville private e retail a scrivere lezioni apprese sintetiche in italiano, da registrare per non ripetere gli stessi errori sulla prossima commessa.

Per ciascun elemento fornito (una criticità chiusa, una decisione presa o un allert chiuso), ragiona sui dati e scrivi tre testi brevi, concreti e in italiano:
- "cosa_e_successo": 1-2 frasi che riassumono il fatto in modo oggettivo, basandoti solo sui dati forniti;
- "cosa_abbiamo_imparato": 1-2 frasi che individuano la causa di fondo o il pattern dietro il fatto, non solo il sintomo superficiale — è la parte di ragionamento vero, non una ripetizione del campo precedente;
- "azione_futura": una frase con un'azione concreta e specifica da fare diversamente sulla prossima commessa, derivata dalla causa individuata.

Non inventare fatti, nomi, date, importi o dettagli tecnici che non sono presenti nei dati forniti: se un'informazione manca, resta più generico su quel punto ma specifico sul resto. Rispondi SOLO con un array JSON valido, nello stesso ordine e con lo stesso numero di elementi dell'input ricevuto, ciascuno con esattamente i tre campi sopra indicati. Nessun testo prima o dopo l'array JSON, nessun blocco di codice.`;

function estraiJson(testo) {
  const senzaFence = testo.trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
  const start = senzaFence.indexOf('[');
  const end = senzaFence.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('la risposta del modello non è in un formato JSON riconoscibile');
  return JSON.parse(senzaFence.slice(start, end + 1));
}

async function generaLezioniApprese(candidati) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error('ANTHROPIC_API_KEY non configurata sul server: aggiungila al file .env (vedi .env.example) per abilitare la generazione ragionata dall\'IA.');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const payload = candidati.map((c) => ({ tipo: c.tipo, titolo: c.titolo, wp: c.wp || null, dati: c.dati || {} }));

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 1800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(payload) }],
      }),
    });
  } catch (networkErr) {
    const err = new Error(`Impossibile contattare il servizio IA: ${networkErr.message}`);
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  if (!res.ok) {
    const corpo = await res.text().catch(() => '');
    const err = new Error(`Il servizio IA ha risposto con un errore (${res.status}): ${corpo.slice(0, 300)}`);
    err.code = 'API_ERROR';
    throw err;
  }

  const body = await res.json();
  const testo = (body?.content || []).find((b) => b.type === 'text')?.text || '';
  let risultati;
  try {
    risultati = estraiJson(testo);
  } catch (parseErr) {
    const err = new Error(`Risposta del modello non interpretabile: ${parseErr.message}`);
    err.code = 'BAD_SHAPE';
    throw err;
  }
  if (!Array.isArray(risultati) || risultati.length !== candidati.length) {
    const err = new Error('Il modello ha restituito un numero di elementi diverso da quello atteso.');
    err.code = 'BAD_SHAPE';
    throw err;
  }

  return risultati.map((r, i) => ({
    id: candidati[i].id,
    cosa_e_successo: (r.cosa_e_successo || '').trim(),
    cosa_abbiamo_imparato: (r.cosa_abbiamo_imparato || '').trim(),
    azione_futura: (r.azione_futura || '').trim(),
  }));
}

module.exports = { generaLezioniApprese };
