import { useEffect, useRef } from 'react';

import request from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

/** Keeps a basket (cart or wishlist) tied to the account rather than the browser. */
export default function useBasketSync({ path, local, onRestore, toPayload, enabled = true }) {
  const { isSignedIn, ready } = useAuth();
  const restored = useRef(false);
  const lastSent = useRef(null);

  // 1. Restore once per sign-in.
  useEffect(() => {
    if (!ready || !isSignedIn || restored.current || !enabled) return;
    restored.current = true;

    let alive = true;
    request(path, { auth: true })
      .then((remote) => {
        if (alive) onRestore(remote);
      })
      .catch(() => {
        // A basket that will not load must not block shopping; the local copy carries on and the next.
      });

    return () => {
      alive = false;
    };
  }, [ready, isSignedIn, enabled, path, onRestore]);

  // Signing out arms the next sign-in to restore again.
  useEffect(() => {
    if (ready && !isSignedIn) restored.current = false;
  }, [ready, isSignedIn]);

  // 2. Mirror changes upward, debounced.
  useEffect(() => {
    if (!ready || !isSignedIn || !restored.current || !enabled) return undefined;

    const payload = toPayload(local);
    const serialised = JSON.stringify(payload);
    if (serialised === lastSent.current) return undefined; // nothing actually changed

    const timer = setTimeout(() => {
      lastSent.current = serialised;
      request(path, { method: 'PUT', auth: true, body: payload }).catch(() => {
        // Let the next change try again rather than surfacing a failed sync as an error over the shop.
        lastSent.current = null;
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [local, ready, isSignedIn, enabled, path, toPayload]);
}
