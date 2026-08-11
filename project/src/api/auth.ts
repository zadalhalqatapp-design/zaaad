import { request, setToken, setRefreshToken, clearTokens } from './client';
import type { Profile, AppRole } from '@/lib/types';

export interface AuthSession {
  token: string;
  refreshToken: string;
  profile: Profile;
}

export async function signUp(
  fullName: string,
  email: string,
  password: string,
  role: AppRole,
): Promise<{ profile: Profile; message: string }> {
  const data = await request<{ token: string; refreshToken: string; profile: Profile; message: string }>(
    'auth_signup',
    { fullName, email, password, role },
  );
  setToken(data.token);
  setRefreshToken(data.refreshToken);
  return { profile: data.profile, message: data.message };
}

export async function signIn(email: string, password: string): Promise<Profile> {
  const data = await request<AuthSession>('auth_login', { email, password });
  setToken(data.token);
  setRefreshToken(data.refreshToken);
  return data.profile;
}

export async function logout(): Promise<void> {
  try { await request('auth_logout', {}); } catch { /* ignore */ }
  clearTokens();
}

export async function getProfile(): Promise<Profile | null> {
  try {
    return await request<Profile>('auth_me', {});
  } catch {
    return null;
  }
}

export async function updateProfile(updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>>): Promise<Profile> {
  return request<Profile>('auth_update_profile', { updates });
}
