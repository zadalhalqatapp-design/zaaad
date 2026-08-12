import { request } from './client';
import type { Program, ProgramBook } from '@/lib/types';

export async function listPrograms(filters?: { published?: boolean; status?: string }): Promise<Program[]> {
  return request<Program[]>('programs_list', { filters });
}

export async function getProgram(id: string): Promise<{ program: Program; books: ProgramBook[] }> {
  return request('programs_get', { id });
}

export async function createProgram(input: {
  name: string;
  description?: string;
  programType: string;
  rules: Record<string, unknown>;
}): Promise<Program> {
  return request<Program>('programs_create', { input });
}

export async function updateProgram(id: string, input: Partial<Program>): Promise<Program> {
  return request<Program>('programs_update', { id, input });
}

export async function archiveProgram(id: string): Promise<void> {
  await request('programs_archive', { id });
}

export async function togglePublish(id: string, published: boolean): Promise<Program> {
  return request<Program>('programs_toggle_publish', { id, published });
}

export async function cloneProgram(id: string): Promise<Program> {
  return request<Program>('programs_clone', { id });
}

export async function linkBook(programId: string, bookId: string): Promise<void> {
  await request('programs_link_book', { programId, bookId });
}

export async function unlinkBook(programId: string, bookId: string): Promise<void> {
  await request('programs_unlink_book', { programId, bookId });
}
