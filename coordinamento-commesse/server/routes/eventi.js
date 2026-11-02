// Stream SSE (Server-Sent Events): tiene aperta una connessione per
// scheda del browser e invia un evento "cambiamento" ogni volta che una
// scrittura va a buon fine da qualunque parte dell'app (vedi il
// middleware globale in index.js e utils/eventBus.js). Il client
// (components/liveSync.js) reagisce ricaricando la pagina correntemente
// aperta, così chi la lascia aperta vede da solo le modifiche fatte da
// un altro utente, senza dover premere F5.
const express = require('express');
const { bus } = require('../utils/eventBus');

const router = express.Router();

router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // evita il buffering di eventuali reverse proxy (nginx)
  });
  res.write('retry: 3000\n\n');

  const onCambiamento = () => res.write('event: cambiamento\ndata: {}\n\n');
  bus.on('cambiamento', onCambiamento);

  // Un ping periodico tiene viva la connessione attraverso proxy/load
  // balancer che altrimenti la chiuderebbero per inattività.
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    bus.removeListener('cambiamento', onCambiamento);
  });
});

module.exports = router;
