import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi } from "../api";
import { tokenStore } from "../api/axiosInstance";
import type { User } from "../types";

interface AuthCtx {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async (token: string) => {
    tokenStore.set(token);
    const me = await authApi.me();
    setUser(me);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { access_token } = await authApi.refresh();
        await loadUser(access_token);
      } catch {
        // not logged in
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await authApi.login(email, password);
    await loadUser(access_token);
  }, [loadUser]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  return <Ctx.Provider value={{ user, isLoading, login, logout, refreshUser }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
