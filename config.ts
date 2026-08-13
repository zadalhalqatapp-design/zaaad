export const APP_CONFIG = {
  // ضع هنا رابط Google Apps Script Web App الذي سينشر من ملف gs/
  APPS_SCRIPT_URL: import.meta.env.VITE_APPS_SCRIPT_URL as string || '',
  APP_NAME: 'زاد الحلقات',
  APP_NAME_EN: 'Zad Al-Halaqat',
  LOGO_URL: '/logo.png',
  PROGRAM_DAYS: 20,
  HADITHS_COUNT: 40,
  HADITHS_PER_DAY: 2,
  SESSION_KEY: 'zad_session',
  SESSION_TIMEOUT_MS: 1000 * 60 * 60 * 8, // 8 hours
};

export type UserRole = 'admin' | 'supervisor' | 'student';

export function isConfigured(): boolean {
  return Boolean(APPS_CONFIG.APPS_SCRIPT_URL);
}

export const APPS_CONFIG = APP_CONFIG;
