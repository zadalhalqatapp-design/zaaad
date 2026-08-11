import { request } from './client';
import type { Enrollment, Profile, Program, Group } from '@/lib/types';

export interface EnrollmentWithRelations extends Enrollment {
  profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'phone'>;
  program: Pick<Program, 'id' | 'name' | 'description'>;
  group: Pick<Group, 'id' | 'name'> | null;
}

export async function listEnrollments(filters?: {
  studentId?: string;
  supervisorId?: string;
  groupId?: string;
  programId?: string;
  status?: string;
}): Promise<EnrollmentWithRelations[]> {
  return request<EnrollmentWithRelations[]>('enrollments_list', { filters });
}

export async function getEnrollment(id: string): Promise<EnrollmentWithRelations> {
  return request('enrollments_get', { id });
}

export async function createEnrollment(input: {
  studentId: string;
  programId: string;
  groupId?: string;
  supervisorId?: string;
}): Promise<Enrollment> {
  return request<Enrollment>('enrollments_create', { input });
}

export async function updateEnrollmentStatus(id: string, status: string): Promise<Enrollment> {
  return request<Enrollment>('enrollments_update_status', { id, status });
}

export async function getMyEnrollments(): Promise<EnrollmentWithRelations[]> {
  return request('enrollments_mine', {});
}
