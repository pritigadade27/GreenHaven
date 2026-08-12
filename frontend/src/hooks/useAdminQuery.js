import { useCallback, useEffect, useState } from 'react';

import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function useAdminQuery(loader, deps = []) {
  const { sessionEnded } = useAdminAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Run loader, drop stale results
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');

    Promise.resolve()
      .then(loader)
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((err) => {
        if (!alive) return;
        // Expired admin session
        if (err.sessionEnded) {
          sessionEnded();
          return;
        }
        setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, error, loading, reload };
}
