import { useSyncExternalStore } from 'react';
import { api } from '@/api';
import { applyTheme } from './apply';
import type { ThemeConfig } from './defaults';
import { TEXT_REGISTRY } from './textRegistry';

/**
 * مخزن المظهر المركزي (خارج React حتى يُطبَّق قبل أول رسم):
 *  - saved: المظهر المعتمد المحفوظ في الخادم (ونسخة في localStorage لتفادي وميض التصميم القديم).
 *  - draft: تعديلات المدير قبل الحفظ؛ تُطبَّق فورًا على الصفحة كمعاينة حيّة ويمكن إلغاؤها.
 */

const CACHE_KEY = 'zad_theme_v1';

interface ThemeState {
  saved: ThemeConfig;
  draft: ThemeConfig | null;
  /** النص الافتراضي → نص المدير، للمفعَّل حاليًا (المسودة إن وُجدت). */
  overrides: Record<string, string>;
}

function buildOverrides(cfg: ThemeConfig): Record<string, string> {
  const out: Record<string, string> = {};
  const texts = cfg.texts ?? {};
  for (const e of TEXT_REGISTRY) {
    const v = texts[e.key];
    if (typeof v === 'string' && v.trim() && v.trim() !== e.def) out[e.def] = v.trim();
  }
  return out;
}

let state: ThemeState = { saved: {}, draft: null, overrides: {} };
const listeners = new Set<() => void>();

function active(s: ThemeState): ThemeConfig {
  return s.draft ?? s.saved;
}

function commit(next: ThemeState) {
  state = { ...next, overrides: buildOverrides(active(next)) };
  applyTheme(active(state));
  listeners.forEach((l) => l());
}

function readCache(): ThemeConfig {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ThemeConfig) : {};
  } catch {
    return {};
  }
}

function writeCache(cfg: ThemeConfig) {
  try {
    if (Object.keys(cfg).length === 0) localStorage.removeItem(CACHE_KEY);
    else localStorage.setItem(CACHE_KEY, JSON.stringify(cfg));
  } catch {
    /* التخزين المحلي اختياري */
  }
}

/** يُستدعى مرة قبل رسم التطبيق: يطبّق آخر مظهر معروف فورًا ثم يجلب الجديد من الخادم. */
export function initTheme() {
  commit({ saved: readCache(), draft: null, overrides: {} });
  void refreshTheme();
}

export async function refreshTheme() {
  try {
    const res = await api.getTheme();
    const remote = (res?.theme ?? {}) as ThemeConfig;
    if (JSON.stringify(remote) !== JSON.stringify(state.saved)) {
      writeCache(remote);
      commit({ ...state, saved: remote });
    }
  } catch {
    /* بلا اتصال: يبقى المظهر المخزَّن محليًا */
  }
}

export function getSaved(): ThemeConfig {
  return state.saved;
}

export function setDraft(cfg: ThemeConfig | null) {
  commit({ ...state, draft: cfg });
}

/** يحفظ المسودة في الخادم (للمدير فقط — يتحقق الخادم من الصلاحية والقيم). */
export async function saveDraft(): Promise<void> {
  if (!state.draft) return;
  const res = await api.saveTheme(state.draft);
  const saved = (res?.theme ?? state.draft) as ThemeConfig;
  writeCache(saved);
  commit({ saved, draft: null, overrides: {} });
}

export async function resetToDefault(): Promise<void> {
  await api.resetTheme();
  writeCache({});
  commit({ saved: {}, draft: null, overrides: {} });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useThemeState(): ThemeState {
  return useSyncExternalStore(subscribe, () => state);
}

/** يعيد دالة tr: تستبدل النص الافتراضي المسجَّل بنص المدير، وتترك أي نص آخر كما هو. */
export function useT(): (text: string) => string {
  const { overrides } = useThemeState();
  return (text: string) => overrides[text] ?? text;
}
