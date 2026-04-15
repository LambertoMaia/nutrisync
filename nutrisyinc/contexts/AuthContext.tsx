import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { LoginSuccessJson, RegisterSuccessJson } from '@/lib/api';
import { logoutApi, verificarLoginApi } from '@/lib/api';

const AUTH_SNAPSHOT_KEY = '@nutrilho/auth_snapshot';

export type AuthUser = {
  id: number;
  tipo: 'cliente' | 'cozinheiro';
  nome: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  setUserFromSession: (payload: LoginSuccessJson | RegisterSuccessJson) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const data = await verificarLoginApi();
      if (data && 'logado' in data && data.logado) {
        const u: AuthUser = {
          id: data.usuario_id,
          tipo: data.usuario_tipo === 'cozinheiro' ? 'cozinheiro' : 'cliente',
          nome: data.usuario_nome,
          email: data.usuario_email ?? '',
        };
        setUser(u);
        await AsyncStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify(u));
      } else {
        setUser(null);
        await AsyncStorage.removeItem(AUTH_SNAPSHOT_KEY);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const setUserFromSession = useCallback(async (payload: LoginSuccessJson | RegisterSuccessJson) => {
    const u: AuthUser = {
      id: payload.usuario_id,
      tipo: payload.usuario_tipo === 'cozinheiro' ? 'cozinheiro' : 'cliente',
      nome: payload.usuario_nome,
      email: payload.usuario_email,
    };
    setUser(u);
    await AsyncStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify(u));
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
    await AsyncStorage.removeItem(AUTH_SNAPSHOT_KEY);
  }, []);

  const value = useMemo(
    () => ({ user, loading, refreshSession, setUserFromSession, logout }),
    [user, loading, refreshSession, setUserFromSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
