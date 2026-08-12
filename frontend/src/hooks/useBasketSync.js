import { useEffect, useRef } from 'react';

import request from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function useBasketSync({ path, local, onRestore, toPayload, enabled = true }) {
  const { isSignedIn, ready } = useAuth();
  const restored = useRef(false);
  const lastSent = useRef(null);

  useEffect(() => {
    if (!ready || !isSignedIn || restored.current || !enabled) return;
    restored.current = true;

    let alive = true;
    request(path, { auth: true })
      .then((remote) => {
        if (alive) onRestore(remote);
      })
      .catch(() => {
      });

    return () => {
      alive = false;
    };
  }, [ready, isSignedIn, enabled, path, onRestore]);

  useEffect(() => {
    if (ready && !isSignedIn) restored.current = false;
  }, [ready, isSignedIn]);

  useEffect(() => {
    if (!ready || !isSignedIn || !restored.current || !enabled) return undefined;

    const payload = toPayload(local);
    const serialised = JSON.stringify(payload);
    if (serialised === lastSent.current) return undefined;

    const timer = setTimeout(() => {
      lastSent.current = serialised;
      request(path, { method: 'PUT', auth: true, body: payload }).catch(() => {
        lastSent.current = null;
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [local, ready, isSignedIn, enabled, path, toPayload]);
}
