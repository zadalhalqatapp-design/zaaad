export const API_BASE_URL =
  (import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined) ?? '';

export const APP_NAME = 'زاد الحلقات';
export const APP_TAGLINE = 'منصة الحلقات والبرامج';

if (!API_BASE_URL) {
  console.warn(
    'VITE_APPS_SCRIPT_URL غير مضبوط. ضع رابط نشر Google Apps Script في متغير البيئة.',
  );
}
