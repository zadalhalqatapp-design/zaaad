import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, clearTokens, getProfile, getToken, logout as apiLogout, signIn as apiSignIn, signUp as apiSignUp, updateProfile as apiUpdateProfile } from '@/api';
import type { AppRole, Profile } from '@/lib/types';

interface ClientSession {
  access_token: string;
}

interface AuthContextValue {
  session: ClientSession | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (fullName: string, email: string, password: string, role: AppRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function translateError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'حدث خطأ أثناء تنفيذ الطلب.';
}

function currentSession(): ClientSession | null {
  const token = getToken();
  return token ? { access_token: token } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const nextSession = currentSession();
    setSession(nextSession);
    if (!nextSession) {
      setProfile(null);
      return;
    }
    const nextProfile = await getProfile();
    setProfile(nextProfile);
    if (!nextProfile) {
      setSession(currentSession());
    }
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));
  }, [refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const nextProfile = await apiSignIn(email, password);
      setSession(currentSession());
      setProfile(nextProfile);
      return { error: null };
    } catch (error) {
      clearTokens();
      setSession(null);
      setProfile(null);
      return { error: translateError(error) };
    }
  }, []);

  const signUp = useCallback(async (fullName: string, email: string, password: string, role: AppRole) => {
    try {
      await apiSignUp(fullName, email, password, role);
      clearTokens();
      setSession(null);
      setProfile(null);
      return { error: null };
    } catch (error) {
      return { error: translateError(error) };
    }
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export async function saveProfile(updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>>): Promise<Profile> {
  return apiUpdateProfile(updates);
}
