import { request } from './client';
import type { Book, BookUnit } from '@/lib/types';

export async function listBooks(filters?: { status?: string; search?: string }): Promise<Book[]> {
  return request<Book[]>('books_list', { filters });
}

export async function getBook(id: string): Promise<{ book: Book; units: BookUnit[] }> {
  return request('books_get', { id });
}

export async function createBook(input: {
  title: string;
  author?: string;
  description?: string;
  category?: string;
  content_type: string;
  is_public: boolean;
}): Promise<Book> {
  return request<Book>('books_create', { input });
}

export async function updateBook(id: string, input: Partial<Book>): Promise<Book> {
  return request<Book>('books_update', { id, input });
}

export async function archiveBook(id: string): Promise<void> {
  await request('books_archive', { id });
}

export async function addUnit(input: {
  bookId: string;
  title: string;
  unitType: string;
  content?: string;
  mediaUrl?: string;
  parentId?: string;
}): Promise<BookUnit> {
  return request<BookUnit>('books_add_unit', { input });
}

export async function updateUnit(id: string, input: Partial<BookUnit>): Promise<BookUnit> {
  return request<BookUnit>('books_update_unit', { id, input });
}

export async function reorderUnits(bookId: string, unitIds: string[]): Promise<void> {
  await request('books_reorder_units', { bookId, unitIds });
}
