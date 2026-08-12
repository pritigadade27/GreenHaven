import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { adminAuthApi, getAdminToken, setAdminToken, clearAdminToken } from '../services/adminApi.js';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore admin session
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
    // Store admin token
    setAdminToken(response.token);
    setAdmin(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminAuthApi.logout();
    } catch {
      // ignore
    }
    clearAdminToken();
    setAdmin(null);
    window.location.replace('/admin/login');
  }, []);

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
