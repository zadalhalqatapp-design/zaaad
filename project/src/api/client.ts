import { API_BASE_URL } from '@/config/env';

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  constructor(message: string, public status: number = 0) {
    super(message);
    this.name = 'ApiError';
  }
}

const TIMEOUT_MS = 30_000;

function getToken(): string | null {
  return localStorage.getItem('zad_token');
}

function setToken(token: string | null) {
  if (token) localStorage.setItem('zad_token', token);
  else localStorage.removeItem('zad_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('zad_refresh');
}

function setRefreshToken(token: string | null) {
  if (token) localStorage.setItem('zad_refresh', token);
  else localStorage.removeItem('zad_refresh');
}

export function clearTokens() {
  setToken(null);
  setRefreshToken(null);
}

export function hasToken(): boolean {
  return !!getToken();
}

async function request<T>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const token = getToken();
  const payload = JSON.stringify({ action, ...params, token });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${API_BASE_URL}?payload=${encodeURIComponent(payload)}`;
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) throw new ApiError('تعذر الاتصال بالخادم.', res.status);

    const json = (await res.json()) as ApiResponse<T>;
    if (!json.ok) throw new ApiError(json.error ?? 'حدث خطأ غير متوقع.');

    return json.data as T;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('انتهت مهلة الطلب. تحقق من اتصالك بالإنترنت.');
    }
    throw new ApiError('تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.');
  }
}

export { request, getToken, setToken, getRefreshToken, setRefreshToken };
