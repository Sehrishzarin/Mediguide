import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

// Where each role lands after signing in
export const homeForRole = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'organization') return '/org';
  return '/patient/home';
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // True until we know whether the stored token (if any) is valid
  const [loading, setLoading] = useState(Boolean(api.getToken()));

  const logout = useCallback(() => {
    api.setToken('');
    setUser(null);
  }, []);

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
  }, [logout]);

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
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.registerUser(payload);
    api.setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  // Partial profile update; the server returns the saved user
  const updateProfile = useCallback(async (payload) => {
    const res = await api.updateUserProfile(payload);
    setUser(res.data);
    return res.data;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const res = await api.changePassword(currentPassword, newPassword);
    api.setToken(res.token);
    setUser(res.user);
  }, []);

  const deleteAccount = useCallback(async (password) => {
    await api.deleteAccount(password);
    logout();
  }, [logout]);

  const value = useMemo(
    () => ({ user, role: user?.role || 'guest', loading, login, register, logout, updateProfile, changePassword, deleteAccount }),
    [user, loading, login, register, logout, updateProfile, changePassword, deleteAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
