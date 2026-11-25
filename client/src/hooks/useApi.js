import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// Carica `path` e lo ricarica quando cambia o quando si chiama refetch().
// Il percorso contiene già la query, quindi basta come dipendenza.
// `loading` è derivato: vero finché la risposta non corrisponde alla
// richiesta corrente, così l'effetto aggiorna lo stato solo nelle callback.
export function useApi(path) {
  const [tick, setTick] = useState(0);
  const key = `${path}#${tick}`;
  const [result, setResult] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    let alive = true;
    api.get(path)
      .then(data => { if (alive) setResult({ key, data, error: null }); })
      .catch(e => { if (alive) setResult(r => ({ key, data: r.data, error: e.message })); });
    return () => { alive = false; };
  }, [path, key]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  return { data: result.data, loading: result.key !== key, error: result.error, refetch };
}
