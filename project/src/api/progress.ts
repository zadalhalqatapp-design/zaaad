import { request } from './client';
import type { ListeningRecord, TestResult, Test, Notification } from '@/lib/types';

export async function listListeningRecords(filters: {
  enrollmentId?: string;
  studentId?: string;
  limit?: number;
}): Promise<ListeningRecord[]> {
  return request<ListeningRecord[]>('listening_list', { filters });
}

export async function createListeningRecord(input: {
  enrollmentId: string;
  unitId: string;
  operationType: string;
  score?: number;
  errors?: unknown[];
  notes?: string;
}): Promise<ListeningRecord> {
  return request<ListeningRecord>('listening_create', { input });
}

export async function listTests(filters: { programId?: string; status?: string }): Promise<Test[]> {
  return request<Test[]>('tests_list', { filters });
}

export async function createTest(input: {
  programId: string;
  title: string;
  description?: string;
  passingScore: number;
  scheduledAt?: string;
}): Promise<Test> {
  return request<Test>('tests_create', { input });
}

export async function listTestResults(filters: { enrollmentId?: string; limit?: number }): Promise<TestResult[]> {
  return request<TestResult[]>('tests_results_list', { filters });
}

export async function recordTestResult(input: {
  testId: string;
  enrollmentId: string;
  score: number;
  passed: boolean;
  errors?: unknown[];
  notes?: string;
}): Promise<TestResult> {
  return request<TestResult>('tests_record_result', { input });
}

export async function listNotifications(): Promise<Notification[]> {
  return request<Notification[]>('notifications_list', {});
}

export async function markNotificationRead(id: string): Promise<void> {
  await request('notifications_mark_read', { id });
}
