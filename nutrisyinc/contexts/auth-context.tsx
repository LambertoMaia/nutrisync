import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { User, UserRole } from '@/types/models';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (role: UserRole, overrides?: Partial<Pick<User, 'id' | 'displayName' | 'email'>>) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function makeMockUser(
  role: UserRole,
  overrides?: Partial<Pick<User, 'id' | 'displayName' | 'email'>>,
): User {
  const id = overrides?.id ?? (role === 'client' ? 'mock-client' : 'mock-cook');
  return {
    id,
    role,
    email: overrides?.email ?? (role === 'client' ? 'cliente@nutrilho.app' : 'cozinheiro@nutrilho.app'),
    displayName:
      overrides?.displayName ?? (role === 'client' ? 'Cliente (demo)' : 'Cozinheiro (demo)'),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const signIn = useCallback(
    (role: UserRole, overrides?: Partial<Pick<User, 'id' | 'displayName' | 'email'>>) => {
      setUser(makeMockUser(role, overrides));
    },
    [],
  );

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      signIn,
      signOut,
    }),
    [user, signIn, signOut],
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
