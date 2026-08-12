import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authApi, getToken, setToken, clearToken } from '../services/api.js';
import { remove } from '../utils/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setReady(true));
  }, []);

  const adopt = useCallback((response) => {
    setToken(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      isSignedIn: Boolean(user),
      refresh: async () => {
        const fresh = await authApi.me();
        setUser(fresh);
        return fresh;
      },
      register: async (fullName, email, password, phone) =>
        adopt(await authApi.register(fullName, email, password, phone)),
      login: async (email, password) => adopt(await authApi.login(email, password)),
      logout: () => {
        clearToken();
        setUser(null);
        remove('greenhaven.cart');
        remove('greenhaven.wishlist');
        window.location.assign('/');
      },
    }),
    [user, ready, adopt]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
