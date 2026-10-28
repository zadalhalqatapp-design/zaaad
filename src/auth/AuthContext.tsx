import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { APPS_CONFIG } from '@/config';
import type { Session, User, UserRole } from '@/types';
import { api, ApiError } from '@/api';

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

const USER_KEY = `${APPS_CONFIG.SESSION_KEY}_user`;
/** أخطاء عابرة (انقطاع شبكة/ردّ غير مفهوم): لا نُخرج المستخدم بسببها. */
const TRANSIENT_CODES = ['NETWORK_ERROR', 'PARSE_ERROR'];

function saveSession(session: Session, user?: User) {
  localStorage.setItem(APPS_CONFIG.SESSION_KEY, JSON.stringify(session));
  if (user) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* امتلاء التخزين لا يمنع الدخول */
    }
  }
}

function loadCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(APPS_CONFIG.SESSION_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, session: null, loading: true });

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      setState({ user: null, session: null, loading: false });
      return;
    }
    // نعرض المستخدم المحفوظ فورًا (بلا شاشة انتظار) ثم نتحقق من الجلسة في الخلفية
    const cachedUser = loadCachedUser();
    if (cachedUser) setState({ user: cachedUser, session, loading: false });

    api
      .verifySession(session.token)
      .then((res) => {
        const data = res as { session: Session; user: User } | null;
        if (data?.session && data?.user) {
          saveSession(data.session, data.user);
          setState({ user: data.user, session: data.session, loading: false });
        } else {
          // الخادم رفض الجلسة صراحةً (منتهية/ملغاة/حساب موقوف)
          clearSession();
          setState({ user: null, session: null, loading: false });
        }
      })
      .catch((err) => {
        const code = err instanceof ApiError ? err.code : undefined;
        if (cachedUser && code && TRANSIENT_CODES.includes(code)) return; // نبقيه مسجّلاً دخوله
        clearSession();
        setState({ user: null, session: null, loading: false });
      });
  }, []);

  // أي طلب لاحق يردّ الخادم عليه "انتهت الجلسة" يُعيد المستخدم لصفحة الدخول
  useEffect(() => {
    const onUnauthorized = () => {
      clearSession();
      setState({ user: null, session: null, loading: false });
    };
    window.addEventListener('zad:unauthorized', onUnauthorized);
    return () => window.removeEventListener('zad:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    const data = res as { session: Session; user: User };
    if (!data?.session || !data?.user) {
      throw new Error('استجابة غير صالحة من الخادم.');
    }
    saveSession(data.session, data.user);
    setState({ user: data.user, session: data.session, loading: false });
    return data;
  }, []);

  const logout = useCallback(() => {
    api.logout().catch(() => {});
    clearSession();
    setState({ user: null, session: null, loading: false });
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setState((prev) => {
      if (!prev.user) return prev;
      const user = { ...prev.user, ...patch };
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        /* تجاهل */
      }
      return { ...prev, user };
    });
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
