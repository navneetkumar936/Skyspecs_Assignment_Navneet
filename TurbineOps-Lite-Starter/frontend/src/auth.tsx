import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getToken, rest, setToken } from './api';

export type Role = 'ADMIN' | 'ENGINEER' | 'VIEWER';
export interface User { id: string; email: string; name: string; role: Role }

interface AuthCtx {
  user: User | null;
  loading: boolean;
  canWrite: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (getToken()) {
      rest<User>('GET', '/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
    }
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const r = await rest<{ token: string; user: User }>('POST', '/auth/login', { email, password });
    setToken(r.token);
    setUser(r.user);
  };
  const logout = () => { setToken(null); setUser(null); };
  const canWrite = user?.role === 'ADMIN' || user?.role === 'ENGINEER';
  const isAdmin = user?.role === 'ADMIN';

  return <Ctx.Provider value={{ user, loading, canWrite, isAdmin, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);