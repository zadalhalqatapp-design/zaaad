import { buildScale, mix } from './color';
import { DEFAULT_COLORS, DEFAULT_FONTS, DEFAULT_LAYOUT, type ColorKey, type ThemeConfig } from './defaults';

/**
 * يطبّق ThemeConfig على الصفحة كلها عبر متغيرات CSS على <html> (Tailwind v4 يقرأ ألوانه
 * وأنصاف أقطاره ومسافاته من متغيرات --color-* و--radius-* و--spacing)، فيتغيّر كل مكوّن دون
 * لمس أي منها. كل استدعاء يزيل أولًا ما وضعه الاستدعاء السابق، فالرجوع للافتراضي = {}.
 */

const BUILT_IN_FONTS = new Set(['Cairo', 'Amiri', 'Noto Naskh Arabic', 'system']);
let applied: string[] = [];
const loadedFonts = new Set<string>();

function ensureFont(name: string) {
  if (BUILT_IN_FONTS.has(name) || loadedFonts.has(name)) return;
  loadedFonts.add(name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

function stack(name: string | undefined, fallback: string, generic: string): string | undefined {
  if (!name) return undefined;
  if (name === 'system') return `system-ui, ${generic}`;
  ensureFont(name);
  return `'${name}', ${fallback}, ${generic}`;
}

const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

export function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement;
  const style = root.style;
  applied.forEach((n) => style.removeProperty(n));
  applied = [];
  const set = (name: string, value: string | undefined) => {
    if (value === undefined) return;
    style.setProperty(name, value);
    applied.push(name);
  };
  const changed = (key: ColorKey) => {
    const v = theme.colors?.[key];
    return isHex(v) && v.toLowerCase() !== DEFAULT_COLORS[key] ? v : undefined;
  };

  // ---- الألوان ----
  const primary = changed('primary');
  if (primary) {
    const s = buildScale(primary, 600);
    for (const [lvl, hex] of Object.entries(s)) set(`--color-primary-${lvl}`, hex);
  }
  const secondary = changed('secondary');
  if (secondary) {
    const s = buildScale(secondary, 500);
    for (const [lvl, hex] of Object.entries(s)) set(`--color-secondary-${lvl}`, hex);
  }
  const success = changed('success');
  if (success) {
    set('--color-success-50', mix(success, '#ffffff', 0.92));
    set('--color-success-200', mix(success, '#ffffff', 0.7));
    set('--color-success-300', mix(success, '#ffffff', 0.5));
    set('--color-success-400', mix(success, '#ffffff', 0.25));
    set('--color-success-500', mix(success, '#ffffff', 0.1));
    set('--color-success-600', success);
    set('--color-success-700', mix(success, '#000000', 0.15));
  }
  const warning = changed('warning');
  if (warning) {
    set('--color-warning-50', mix(warning, '#ffffff', 0.92));
    set('--color-warning-400', mix(warning, '#ffffff', 0.35));
    set('--color-warning-500', mix(warning, '#ffffff', 0.15));
    set('--color-warning-600', warning);
  }
  const error = changed('error');
  if (error) {
    set('--color-error-50', mix(error, '#ffffff', 0.93));
    set('--color-error-400', mix(error, '#ffffff', 0.35));
    set('--color-error-500', mix(error, '#ffffff', 0.15));
    set('--color-error-600', error);
    set('--color-error-700', mix(error, '#000000', 0.15));
  }
  const bg = changed('background');
  if (bg) set('--color-surface-dim', bg);
  const surface = changed('surface');
  if (surface) {
    set('--color-surface', surface);
    set('--color-surface-bright', surface);
  }
  const text = changed('text');
  if (text) set('--color-on-surface', text);
  const muted = changed('textMuted');
  if (muted) set('--color-on-surface-variant', muted);
  const border = changed('border');
  if (border) {
    set('--color-outline-variant', border);
    set('--color-outline', mix(border, '#000000', 0.1));
  }

  // ---- الخطوط ----
  const f = theme.fonts ?? {};
  if (f.ui && f.ui !== DEFAULT_FONTS.ui) set('--font-sans', stack(f.ui, 'system-ui', 'sans-serif'));
  if (f.hadith && f.hadith !== DEFAULT_FONTS.hadith) set('--font-arabic', stack(f.hadith, 'serif', 'serif'));
  if (f.explanation && f.explanation !== DEFAULT_FONTS.explanation) set('--font-naskh', stack(f.explanation, 'serif', 'serif'));
  if (typeof f.baseSize === 'number' && f.baseSize !== DEFAULT_FONTS.baseSize) set('font-size', `${f.baseSize}px`);
  if (typeof f.lineHeight === 'number' && f.lineHeight !== DEFAULT_FONTS.lineHeight) set('--reading-leading', String(f.lineHeight));
  if (typeof f.weight === 'number' && f.weight !== DEFAULT_FONTS.weight) set('--body-weight', String(f.weight));

  // ---- التنسيق ----
  const l = theme.layout ?? {};
  if (typeof l.radius === 'number' && l.radius !== DEFAULT_LAYOUT.radius) {
    const k = l.radius;
    const scale: Record<string, number> = { xs: 0.125, sm: 0.25, md: 0.375, lg: 0.5, xl: 0.75, '2xl': 1, '3xl': 1.5, '4xl': 2 };
    for (const [name, rem] of Object.entries(scale)) set(`--radius-${name}`, `${(rem * k).toFixed(3)}rem`);
  }
  if (typeof l.density === 'number' && l.density !== DEFAULT_LAYOUT.density) {
    set('--spacing', `${(0.25 * l.density).toFixed(4)}rem`);
  }
  if (l.buttonShape === 'pill') set('--btn-radius', '9999px');
  else if (l.buttonShape === 'square') set('--btn-radius', '0.25rem');
  root.classList.toggle('no-shadows', l.shadows === false);
}

/** تعيين الصفحة على التصميم الافتراضي تمامًا. */
export function clearTheme() {
  applyTheme({});
}
