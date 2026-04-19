import React, { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/client';
import { setTokens, clearTokens, saveUser, loadUser } from './storage';
import type { User } from '../types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, login: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser().then((u) => { setUser(u); setLoading(false); });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await client.post('/api/auth/mobile/login', { email, password });
    await setTokens(res.data.access_token, res.data.refresh_token);
    await saveUser(res.data.user);
    setUser(res.data.user);
  };

  const logout = async () => {
    await clearTokens();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
