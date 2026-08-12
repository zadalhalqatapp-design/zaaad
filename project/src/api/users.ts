import { request } from './client';
import type { Profile } from '@/lib/types';

export async function listUsers(filters?: { role?: string; status?: string; search?: string }): Promise<Profile[]> {
  return request<Profile[]>('users_list', { filters });
}

export async function updateUserStatus(id: string, status: string): Promise<Profile> {
  return request<Profile>('users_update_status', { id, status });
}
