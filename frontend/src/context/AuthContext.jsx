import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

// Where each role lands after signing in
export const homeForRole = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'organization') return '/org';
  return '/patient/home';
};

// Last known user, so a returning user sees the app instantly while /me refreshes
// in the background (free hosting can take ~30s to wake up).
const CACHE_KEY = 'mediguide_user_cache';
const readCachedUser = () => {
  if (!api.getToken()) return null;
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || null; } catch { return null; }
};
const writeCachedUser = (u) => {
  try {
    if (u) localStorage.setItem(CACHE_KEY, JSON.stringify(u));
    else localStorage.removeItem(CACHE_KEY);
  } catch { /* storage unavailable */ }
};

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(readCachedUser);
  // True until we know whether the stored token (if any) is valid; skipped when a cached user exists
  const [loading, setLoading] = useState(() => Boolean(api.getToken()) && !readCachedUser());

  const setUser = useCallback((u) => {
    setUserState(u);
    writeCachedUser(u);
  }, []);

  const logout = useCallback(() => {
    api.setToken('');
    setUser(null);
  }, [setUser]);

  // Restore the session from the stored token
  useEffect(() => {
    if (!api.getToken()) return;
    let cancelled = false;
    api.getCurrentUser()
      .then((res) => { if (!cancelled) setUser(res.data); })
      .catch((err) => {
        // Only drop the session when the server says the token is bad, not on a network blip
        if (!cancelled && err.status === 401) logout();
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [logout, setUser]);

  // Any API call that comes back 401 signs the user out everywhere
  useEffect(() => {
    window.addEventListener('mediguide:unauthorized', logout);
    return () => window.removeEventListener('mediguide:unauthorized', logout);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const res = await api.loginUser(email, password);
    api.setToken(res.token);
    setUser(res.user);
    return res.user;
  }, [setUser]);

  const register = useCallback(async (payload) => {
    const res = await api.registerUser(payload);
    api.setToken(res.token);
    setUser(res.user);
    return res.user;
  }, [setUser]);

  // Partial profile update; the server returns the saved user
  const updateProfile = useCallback(async (payload) => {
    const res = await api.updateUserProfile(payload);
    setUser(res.data);
    return res.data;
  }, [setUser]);

  // Re-read the user from the server (e.g. after a care plan changes the pregnancy status)
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getCurrentUser();
      setUser(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, [setUser]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const res = await api.changePassword(currentPassword, newPassword);
    api.setToken(res.token);
    setUser(res.user);
  }, [setUser]);

  const deleteAccount = useCallback(async (password) => {
    await api.deleteAccount(password);
    logout();
  }, [logout]);

  const value = useMemo(
    () => ({ user, role: user?.role || 'guest', loading, login, register, logout, updateProfile, refreshUser, changePassword, deleteAccount }),
    [user, loading, login, register, logout, updateProfile, refreshUser, changePassword, deleteAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
