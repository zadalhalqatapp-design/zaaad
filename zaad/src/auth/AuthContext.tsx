import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { APPS_CONFIG } from '@/config';
import type { Session, User, UserRole } from '@/types';
import { api } from '@/api';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ user: User; session: Session }>;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(APPS_CONFIG.SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (Date.now() > s.expiresAt) {
      localStorage.removeItem(APPS_CONFIG.SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function saveSession(session: Session) {
  localStorage.setItem(APPS_CONFIG.SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(APPS_CONFIG.SESSION_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, session: null, loading: true });

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      setState({ user: null, session: null, loading: false });
      return;
    }
    // Verify session against backend
    api
      .verifySession(session.token)
      .then((res) => {
        const data = res as { session: Session; user: User };
        if (data?.session && data?.user) {
          saveSession(data.session);
          setState({ user: data.user, session: data.session, loading: false });
        } else {
          clearSession();
          setState({ user: null, session: null, loading: false });
        }
      })
      .catch(() => {
        clearSession();
        setState({ user: null, session: null, loading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    const data = res as { session: Session; user: User };
    if (!data?.session || !data?.user) {
      throw new Error('استجابة غير صالحة من الخادم.');
    }
    saveSession(data.session);
    setState({ user: data.user, session: data.session, loading: false });
    return data;
  }, []);

  const logout = useCallback(() => {
    api.logout().catch(() => {});
    clearSession();
    setState({ user: null, session: null, loading: false });
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setState((prev) => (prev.user ? { ...prev, user: { ...prev.user, ...patch } } : prev));
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!state.user) return false;
      return roles.includes(state.user.role);
    },
    [state.user],
  );

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
