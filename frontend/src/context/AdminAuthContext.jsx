import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { adminAuthApi, getAdminToken, setAdminToken, clearAdminToken } from '../services/adminApi.js';

const AdminAuthContext = createContext(null);

/** Admin sign-in state. */
export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) {
      setReady(true);
      return;
    }
    let alive = true;
    adminAuthApi
      .me()
      .then((user) => alive && setAdmin(user))
      .catch(() => {
        clearAdminToken();
        if (alive) setAdmin(null);
      })
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await adminAuthApi.login(email, password);
    setAdminToken(response.token);
    setAdmin(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    // Tell the server first.
    try {
      await adminAuthApi.logout();
    } catch {
      // Already expired or the network is down; the local clear still happens.
    }
    clearAdminToken();
    setAdmin(null);
    // A hard replace rather than a client-side navigate: it discards the in-memory React tree along with every order and customer record the dashboard had already fetched, so Back cannot paint a cached screen.
    window.location.replace('/admin/login');
  }, []);

  /** Called when any admin request comes back 401/403 mid-session. */
  const sessionEnded = useCallback(() => {
    clearAdminToken();
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ admin, ready, isAdmin: Boolean(admin), login, logout, sessionEnded }),
    [admin, ready, login, logout, sessionEnded]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return ctx;
}
