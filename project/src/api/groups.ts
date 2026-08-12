import { request } from './client';
import type { Group, GroupMember, Profile } from '@/lib/types';

export async function listGroups(filters?: { programId?: string; status?: string }): Promise<Group[]> {
  return request<Group[]>('groups_list', { filters });
}

export async function createGroup(input: {
  programId: string;
  name: string;
  description?: string;
  supervisorId?: string;
}): Promise<Group> {
  return request<Group>('groups_create', { input });
}

export async function updateGroup(id: string, input: Partial<Group>): Promise<Group> {
  return request<Group>('groups_update', { id, input });
}

export async function archiveGroup(id: string): Promise<void> {
  await request('groups_archive', { id });
}

export async function listGroupMembers(groupId: string): Promise<(GroupMember & { profile: Pick<Profile, 'id' | 'full_name' | 'email'> })[]> {
  return request('groups_list_members', { groupId });
}

export async function addMember(groupId: string, userId: string, memberRole: string): Promise<void> {
  await request('groups_add_member', { groupId, userId, memberRole });
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
  await request('groups_remove_member', { groupId, userId });
}

export async function transferStudent(enrollmentId: string, toGroupId: string): Promise<void> {
  await request('groups_transfer_student', { enrollmentId, toGroupId });
}
