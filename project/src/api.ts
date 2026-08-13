import { APPS_CONFIG } from '@/config';
import type { ApiResponse, Session, User, Hadith, ProgressRecord, DailyLesson, Cycle, Certificate, Message, Notification, DashboardData, AppSettings, OperationLog, Backup } from '@/types';

type AnyData = Record<string, unknown> | unknown[] | string | number | boolean | null | object;

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function request<T extends AnyData>(
  action: string,
  payload: Record<string, unknown> = {},
  method: 'GET' | 'POST' = 'POST',
): Promise<T> {
  if (!APPS_CONFIG.APPS_SCRIPT_URL) {
    throw new ApiError(
      'لم يتم ضبط رابط Google Apps Script. يرجى إضافته في ملف .env باسم VITE_APPS_SCRIPT_URL.',
      'NOT_CONFIGURED',
    );
  }

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(APPS_CONFIG.SESSION_KEY) : null;
  let tokenValue: string | null = null;
  if (token) {
    try {
      tokenValue = (JSON.parse(token) as { token?: string }).token ?? null;
    } catch {
      tokenValue = null;
    }
  }

  try {
    let response: Response;
    const body = JSON.stringify({ action, ...payload, token: tokenValue });

    if (method === 'GET') {
      const params = new URLSearchParams({ payload: body });
      response = await fetch(`${APPS_CONFIG.APPS_SCRIPT_URL}?${params.toString()}`, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
    } else {
      response = await fetch(APPS_CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
      });
    }

    const text = await response.text();
    let json: ApiResponse<T>;
    try {
      json = JSON.parse(text) as ApiResponse<T>;
    } catch {
      console.error('[API] Parse error for action:', action, '| Raw response:', text.slice(0, 500));
      throw new ApiError('استجابة غير صالحة من الخادم.', 'PARSE_ERROR');
    }

    if (!json.success) {
      console.error('[API] Server error for action:', action, '| Error:', json.error, '| Code:', json.code);
      throw new ApiError(json.error || 'حدث خطأ في الخادم.', json.code);
    }
    return json.data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error('[API] Network error for action:', action, '| Error:', err);
    throw new ApiError(
      'تعذّر الاتصال بالخادم. تحقق من الاتصال بالإنترنت أو رابط Apps Script.',
      'NETWORK_ERROR',
    );
  }
}

export interface LoginResponse {
  session: Session;
  user: User;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<LoginResponse>('login', { email, password }),
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    request('register', data),
  logout: () => request('logout', {}),
  verifySession: (token: string) => request<LoginResponse>('verifySession', { token }),

  // Students
  getStudents: () => request<User[]>('getStudents', {}, 'GET'),
  approveStudent: (studentId: string) => request('approveStudent', { studentId }),
  rejectStudent: (studentId: string, reason: string) => request('rejectStudent', { studentId, reason }),
  suspendStudent: (studentId: string, reason: string) => request('suspendStudent', { studentId, reason }),
  reinstateStudent: (studentId: string) => request('reinstateStudent', { studentId }),
  updateStudent: (studentId: string, data: Record<string, unknown>) =>
    request('updateStudent', { studentId, data }),
  deleteStudent: (studentId: string) => request('deleteStudent', { studentId }),

  // Supervisors
  getSupervisors: () => request<User[]>('getSupervisors', {}, 'GET'),
  addSupervisor: (data: { name: string; email: string; password: string; phone?: string }) =>
    request('addSupervisor', data),
  updateSupervisor: (id: string, data: Record<string, unknown>) =>
    request('updateSupervisor', { id, data }),
  deleteSupervisor: (id: string) => request('deleteSupervisor', { id }),

  // Admins
  getAdmins: () => request<User[]>('getAdmins', {}, 'GET'),
  addAdmin: (data: { name: string; email: string; password: string; phone?: string }) =>
    request('addAdmin', data),
  updateAdmin: (id: string, data: Record<string, unknown>) => request('updateAdmin', { id, data }),
  deleteAdmin: (id: string) => request('deleteAdmin', { id }),

  // Hadiths
  getHadiths: () => request<Hadith[]>('getHadiths', {}, 'GET'),
  getHadith: (hadithId: string) => request<Hadith>('getHadith', { hadithId }, 'GET'),
  addHadith: (data: Record<string, unknown>) => request('addHadith', data),
  updateHadith: (hadithId: string, data: Record<string, unknown>) =>
    request('updateHadith', { hadithId, data }),
  deleteHadith: (hadithId: string) => request('deleteHadith', { hadithId }),

  // Progress
  getProgress: (studentId: string) => request<ProgressRecord[]>('getProgress', { studentId }, 'GET'),
  saveProgress: (hadithId: string, field: 'memorized' | 'listened' | 'read', value: boolean) =>
    request('saveProgress', { hadithId, field, value }),
  saveMediaProgress: (hadithId: string, mediaType: 'video' | 'audio' | 'pdf', data: Record<string, unknown>) =>
    request<{ success: boolean; completed: boolean; threshold: number }>('saveMediaProgress', { hadithId, mediaType, data }),
  getDailyLessons: () => request<DailyLesson>('getDailyLessons', {}, 'GET'),

  // Cycles
  getCycles: () => request<Cycle[]>('getCycles', {}, 'GET'),
  startCycle: (name: string, studentIds: string[]) => request('startCycle', { name, studentIds }),
  completeCycle: (cycleId: string) => request('completeCycle', { cycleId }),

  // Certificates
  getCertificates: (studentId?: string) => request<Certificate[]>('getCertificates', { studentId }, 'GET'),
  issueCertificate: (studentId: string, cycleId: string) =>
    request('issueCertificate', { studentId, cycleId }),
  downloadCertificate: (certificateId: string) => request('downloadCertificate', { certificateId }, 'GET'),

  // Messages
  getMessages: (userId: string) => request<Message[]>('getMessages', { userId }, 'GET'),
  sendMessage: (toId: string, subject: string, body: string) =>
    request('sendMessage', { toId, subject, body }),
  markMessageRead: (messageId: string) => request('markMessageRead', { messageId }),

  // Notifications
  getNotifications: () => request<Notification[]>('getNotifications', {}, 'GET'),
  sendNotification: (data: { title: string; body: string; target: string; targetId?: string }) =>
    request('sendNotification', data),

  // Profile
  updateProfile: (data: Record<string, unknown>) => request('updateProfile', data),
  changePassword: (oldPassword: string, newPassword: string) =>
    request('changePassword', { oldPassword, newPassword }),
  resetPassword: (studentId: string) => request('resetPassword', { studentId }),

  // Dashboard
  getDashboard: () => request<DashboardData>('getDashboard', {}, 'GET'),

  // Settings
  getSettings: () => request<AppSettings>('getSettings', {}, 'GET'),
  updateSettings: (data: Record<string, unknown>) => request('updateSettings', { data }),

  // Operations log
  getOperationLog: () => request<OperationLog[]>('getOperationLog', {}, 'GET'),

  // Backups
  getBackups: () => request<Backup[]>('getBackups', {}, 'GET'),
  backupDatabase: (name: string) => request('backupDatabase', { name }),
  restoreBackup: (backupId: string) => request('restoreBackup', { backupId }),
};

export type Api = typeof api;
