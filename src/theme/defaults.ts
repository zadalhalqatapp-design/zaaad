/**
 * Design Tokens القابلة للتخصيص. القيم الافتراضية هنا مطابقة تمامًا لما في src/index.css —
 * لا يُكتب في CSS/المتصفح شيء إلا ما غيّره المدير عن الافتراضي، فيبقى المظهر الأصلي كما هو
 * ما لم يُخصَّص.
 */

export type ColorKey =
  | 'primary' | 'secondary' | 'background' | 'surface' | 'text' | 'textMuted'
  | 'border' | 'success' | 'warning' | 'error';

export type ButtonShape = 'rounded' | 'pill' | 'square';

export interface ThemeConfig {
  colors?: Partial<Record<ColorKey, string>>;
  fonts?: {
    ui?: string;
    hadith?: string;
    explanation?: string;
    baseSize?: number;
    lineHeight?: number;
    weight?: number;
  };
  layout?: {
    radius?: number;
    density?: number;
    shadows?: boolean;
    buttonShape?: ButtonShape;
  };
  texts?: Record<string, string>;
}

export const DEFAULT_COLORS: Record<ColorKey, string> = {
  primary: '#064e3b',
  secondary: '#c9a227',
  background: '#faf8f2',
  surface: '#ffffff',
  text: '#1a1f1c',
  textMuted: '#555555',
  border: '#e8e3d4',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
};

export const COLOR_LABELS: { key: ColorKey; label: string; hint: string }[] = [
  { key: 'primary', label: 'اللون الأساسي', hint: 'الشريط العلوي والأزرار الرئيسية والقائمة الجانبية' },
  { key: 'secondary', label: 'اللون الثانوي (الذهبي)', hint: 'التمييزات والشارات والزخارف' },
  { key: 'background', label: 'خلفية الصفحات', hint: 'لون خلف البطاقات' },
  { key: 'surface', label: 'خلفية البطاقات', hint: 'البطاقات والنوافذ وحقول الإدخال' },
  { key: 'text', label: 'لون النص الأساسي', hint: 'العناوين والنصوص الرئيسية' },
  { key: 'textMuted', label: 'لون النص الثانوي', hint: 'الأوصاف والتسميات الصغيرة' },
  { key: 'border', label: 'لون الحدود', hint: 'حدود البطاقات والجداول والحقول' },
  { key: 'success', label: 'النجاح', hint: 'الإنجاز المكتمل والرسائل الناجحة' },
  { key: 'warning', label: 'التحذير', hint: 'الطلبات المعلّقة والتنبيهات' },
  { key: 'error', label: 'الخطأ', hint: 'الحذف والإيقاف ورسائل الخطأ' },
];

/** خطوط عربية متاحة (Google Fonts) + خط الجهاز. تطابق القائمة البيضاء في gs/Theme.gs. */
export const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Cairo', label: 'القاهرة (Cairo)' },
  { value: 'Tajawal', label: 'تجوّل (Tajawal)' },
  { value: 'Almarai', label: 'المراعي (Almarai)' },
  { value: 'IBM Plex Sans Arabic', label: 'IBM Plex Sans Arabic' },
  { value: 'Noto Kufi Arabic', label: 'نوتو كوفي (Noto Kufi)' },
  { value: 'Readex Pro', label: 'Readex Pro' },
  { value: 'El Messiri', label: 'المسيري (El Messiri)' },
  { value: 'Changa', label: 'تشانغا (Changa)' },
  { value: 'Reem Kufi', label: 'ريم كوفي (Reem Kufi)' },
  { value: 'Noto Naskh Arabic', label: 'نوتو نسخ (Noto Naskh)' },
  { value: 'Amiri', label: 'أميري (Amiri)' },
  { value: 'Scheherazade New', label: 'شهرزاد (Scheherazade)' },
  { value: 'Lateef', label: 'لطيف (Lateef)' },
  { value: 'Harmattan', label: 'هرمتان (Harmattan)' },
  { value: 'Markazi Text', label: 'مركزي (Markazi Text)' },
  { value: 'system', label: 'خط الجهاز' },
];

export const DEFAULT_FONTS = {
  ui: 'Cairo',
  hadith: 'Amiri',
  explanation: 'Noto Naskh Arabic',
  baseSize: 16,
  lineHeight: 2.2,
  weight: 400,
};

export const DEFAULT_LAYOUT = {
  radius: 1,
  density: 1,
  shadows: true,
  buttonShape: 'rounded' as ButtonShape,
};

export const LIMITS = {
  baseSize: { min: 14, max: 20, step: 0.5 },
  lineHeight: { min: 1.6, max: 2.8, step: 0.05 },
  radius: { min: 0, max: 2, step: 0.05 },
  density: { min: 0.85, max: 1.15, step: 0.01 },
  maxTextLength: 200,
};
