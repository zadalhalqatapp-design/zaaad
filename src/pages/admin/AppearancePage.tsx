import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RotateCcw, Save, Undo2, Search, Palette, Type, LayoutTemplate, TextCursorInput } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { contrast } from '@/theme/color';
import {
  COLOR_LABELS, DEFAULT_COLORS, DEFAULT_FONTS, DEFAULT_LAYOUT, FONT_OPTIONS, LIMITS,
  type ButtonShape, type ColorKey, type ThemeConfig,
} from '@/theme/defaults';
import { getSaved, resetToDefault, saveDraft, setDraft as setStoreDraft, useThemeState } from '@/theme/store';
import { TEXT_GROUPS, TEXT_REGISTRY } from '@/theme/textRegistry';

type Tab = 'colors' | 'fonts' | 'layout' | 'texts';

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'colors', label: 'الألوان', icon: Palette },
  { id: 'fonts', label: 'الخطوط', icon: Type },
  { id: 'layout', label: 'التنسيقات', icon: LayoutTemplate },
  { id: 'texts', label: 'النصوص', icon: TextCursorInput },
];

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** يحذف القيم المطابقة للافتراضي أو الفارغة فيبقى المحفوظ في الخادم صغيرًا ودقيقًا. */
function compact(cfg: ThemeConfig): ThemeConfig {
  const out: ThemeConfig = {};
  const colors = Object.fromEntries(
    Object.entries(cfg.colors ?? {}).filter(([k, v]) => v && v.toLowerCase() !== DEFAULT_COLORS[k as ColorKey]),
  );
  if (Object.keys(colors).length) out.colors = colors;

  const f = cfg.fonts ?? {};
  const fonts: NonNullable<ThemeConfig['fonts']> = {};
  (['ui', 'hadith', 'explanation'] as const).forEach((k) => {
    if (f[k] && f[k] !== DEFAULT_FONTS[k]) fonts[k] = f[k];
  });
  (['baseSize', 'lineHeight', 'weight'] as const).forEach((k) => {
    if (typeof f[k] === 'number' && f[k] !== DEFAULT_FONTS[k]) fonts[k] = f[k];
  });
  if (Object.keys(fonts).length) out.fonts = fonts;

  const l = cfg.layout ?? {};
  const layout: NonNullable<ThemeConfig['layout']> = {};
  if (typeof l.radius === 'number' && l.radius !== DEFAULT_LAYOUT.radius) layout.radius = l.radius;
  if (typeof l.density === 'number' && l.density !== DEFAULT_LAYOUT.density) layout.density = l.density;
  if (l.shadows === false) layout.shadows = false;
  if (l.buttonShape && l.buttonShape !== DEFAULT_LAYOUT.buttonShape) layout.buttonShape = l.buttonShape;
  if (Object.keys(layout).length) out.layout = layout;

  const known = new Set(TEXT_REGISTRY.map((e) => e.key));
  const defs = Object.fromEntries(TEXT_REGISTRY.map((e) => [e.key, e.def]));
  const texts = Object.fromEntries(
    Object.entries(cfg.texts ?? {}).filter(([k, v]) => known.has(k) && v.trim() && v.trim() !== defs[k]),
  );
  if (Object.keys(texts).length) out.texts = texts;
  return out;
}

export function AppearancePage() {
  const { notify } = useToast();
  const { saved } = useThemeState();
  const [tab, setTab] = useState<Tab>('colors');
  const [draft, setDraftLocal] = useState<ThemeConfig>(() => clone(getSaved()));
  const [busy, setBusy] = useState<'save' | 'reset' | null>(null);

  // المعاينة حيّة: كل تعديل يُطبَّق فورًا على التطبيق كله (وليس هذه الصفحة فقط)
  useEffect(() => {
    setStoreDraft(compact(draft));
  }, [draft]);
  // عند مغادرة الصفحة تُلغى أي تعديلات لم تُحفظ
  useEffect(() => () => setStoreDraft(null), []);

  // تحذير قبل إغلاق التبويب بتعديلات غير محفوظة
  const dirty = useMemo(() => JSON.stringify(compact(draft)) !== JSON.stringify(compact(saved)), [draft, saved]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const setColor = (k: ColorKey, v: string) => setDraftLocal((d) => ({ ...d, colors: { ...d.colors, [k]: v } }));
  const setFont = <K extends keyof NonNullable<ThemeConfig['fonts']>>(k: K, v: NonNullable<ThemeConfig['fonts']>[K]) =>
    setDraftLocal((d) => ({ ...d, fonts: { ...d.fonts, [k]: v } }));
  const setLayout = <K extends keyof NonNullable<ThemeConfig['layout']>>(k: K, v: NonNullable<ThemeConfig['layout']>[K]) =>
    setDraftLocal((d) => ({ ...d, layout: { ...d.layout, [k]: v } }));
  const setText = (key: string, v: string) => setDraftLocal((d) => ({ ...d, texts: { ...d.texts, [key]: v } }));

  const colors = { ...DEFAULT_COLORS, ...draft.colors };
  const warnings: string[] = [];
  if (contrast(colors.text, colors.surface) < 4.5) warnings.push('تباين النص الأساسي مع خلفية البطاقات ضعيف (أقل من 4.5) وقد يصعب قراءته.');
  if (contrast(colors.text, colors.background) < 4.5) warnings.push('تباين النص الأساسي مع خلفية الصفحة ضعيف.');
  if (contrast('#ffffff', colors.primary) < 4.5) warnings.push('النص الأبيض على اللون الأساسي (الشريط والأزرار) غير واضح؛ اختر لونًا أغمق.');
  if (contrast(colors.textMuted, colors.surface) < 3) warnings.push('لون النص الثانوي باهت جدًا على البطاقات.');

  const handleSave = async () => {
    if (warnings.length && !confirm(`تنبيهات قراءة:\n- ${warnings.join('\n- ')}\n\nهل تريد الحفظ رغم ذلك؟`)) return;
    setBusy('save');
    try {
      await saveDraft();
      notify('تم حفظ المظهر وتطبيقه على جميع الصفحات والأجهزة', 'success');
      setDraftLocal(clone(getSaved()));
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذّر حفظ المظهر.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleDiscard = () => {
    setDraftLocal(clone(getSaved()));
    notify('أُلغيت التعديلات غير المحفوظة', 'info');
  };

  const handleReset = async () => {
    if (!confirm('استعادة المظهر الافتراضي (الألوان والخطوط والتنسيق والنصوص) لجميع المستخدمين؟')) return;
    setBusy('reset');
    try {
      await resetToDefault();
      setDraftLocal({});
      notify('تمت استعادة المظهر الافتراضي', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذّرت الاستعادة.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="إعدادات المظهر والهوية البصرية"
        subtitle="عدّل الألوان والخطوط والنصوص وشاهد النتيجة فورًا، ثم احفظ لتُطبَّق على كل الأجهزة"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outlined" icon={<Undo2 size={16} />} onClick={handleDiscard} disabled={!dirty || !!busy}>إلغاء التعديلات</Button>
            <Button variant="outlined" icon={<RotateCcw size={16} />} onClick={handleReset} loading={busy === 'reset'} disabled={!!busy}>استعادة الافتراضي</Button>
            <Button icon={<Save size={16} />} onClick={handleSave} loading={busy === 'save'} disabled={!dirty || !!busy}>حفظ وتطبيق</Button>
          </div>
        }
      />

      {dirty && (
        <p className="mb-4 rounded-xl bg-warning-50 px-4 py-2.5 text-sm text-warning-600">
          هذه معاينة فقط — لن تظهر لبقية المستخدمين قبل الضغط على «حفظ وتطبيق». تغادر الصفحة فتُلغى التعديلات.
        </p>
      )}
      {warnings.length > 0 && (
        <div className="mb-4 space-y-1 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">
          {warnings.map((w) => (
            <p key={w} className="flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" /> {w}</p>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl bg-surface p-1 shadow-sm ring-1 ring-outline-variant">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    tab === t.id ? 'bg-primary-600 text-white' : 'text-on-surface-variant hover:bg-surface-dim'
                  }`}
                >
                  <Icon size={16} /> {t.label}
                </button>
              );
            })}
          </div>

          {tab === 'colors' && <ColorsTab colors={colors} onChange={setColor} />}
          {tab === 'fonts' && <FontsTab draft={draft} onChange={setFont} />}
          {tab === 'layout' && <LayoutTab draft={draft} onChange={setLayout} />}
          {tab === 'texts' && <TextsTab texts={draft.texts ?? {}} onChange={setText} />}
        </div>

        <Preview />
      </div>
    </div>
  );
}

// ---------------- الألوان ----------------

function ColorsTab({ colors, onChange }: { colors: Record<ColorKey, string>; onChange: (k: ColorKey, v: string) => void }) {
  return (
    <Card>
      <CardHeader title="الألوان" subtitle="اختر لون الهوية وبقية الألوان؛ تُولَّد درجاته تلقائيًا" />
      <div className="grid gap-4 sm:grid-cols-2">
        {COLOR_LABELS.map(({ key, label, hint }) => {
          const changed = colors[key].toLowerCase() !== DEFAULT_COLORS[key];
          return (
            <div key={key} className="rounded-xl border border-outline-variant p-3">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => onChange(key, e.target.value)}
                  aria-label={label}
                  className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-outline-variant bg-transparent p-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-on-surface">{label}</p>
                  <p className="text-xs text-on-surface-variant">{hint}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span dir="ltr" className="rounded-lg bg-surface-dim px-2 py-1 font-mono text-xs text-on-surface-variant">{colors[key].toUpperCase()}</span>
                {changed && (
                  <button type="button" onClick={() => onChange(key, DEFAULT_COLORS[key])} className="text-xs text-primary-700 hover:underline">
                    الافتراضي
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------- الخطوط ----------------

function FontSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-on-surface">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
    </label>
  );
}

function Slider({
  label, value, min, max, step, onChange, format,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-sm font-medium text-on-surface">
        {label}
        <span className="font-mono text-xs text-on-surface-variant" dir="ltr">{format ? format(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-primary-600" />
    </label>
  );
}

function FontsTab({ draft, onChange }: { draft: ThemeConfig; onChange: <K extends keyof NonNullable<ThemeConfig['fonts']>>(k: K, v: NonNullable<ThemeConfig['fonts']>[K]) => void }) {
  const f = { ...DEFAULT_FONTS, ...draft.fonts };
  return (
    <Card>
      <CardHeader title="الخطوط" subtitle="خطوط ويب عربية تُحمَّل عند الحاجة فقط" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FontSelect label="خط الواجهة" value={f.ui} onChange={(v) => onChange('ui', v)} />
        <FontSelect label="خط نص الحديث" value={f.hadith} onChange={(v) => onChange('hadith', v)} />
        <FontSelect label="خط الشرح" value={f.explanation} onChange={(v) => onChange('explanation', v)} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-on-surface">وزن نص الواجهة</span>
          <select
            value={f.weight}
            onChange={(e) => onChange('weight', Number(e.target.value))}
            className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-sm"
          >
            <option value={400}>عادي (400)</option>
            <option value={500}>متوسط (500)</option>
            <option value={600}>سميك (600)</option>
          </select>
        </label>
        <Slider label="حجم الخط الأساسي" {...LIMITS.baseSize} value={f.baseSize} onChange={(v) => onChange('baseSize', v)} format={(v) => `${v}px`} />
        <Slider label="تباعد أسطر الحديث والشرح" {...LIMITS.lineHeight} value={f.lineHeight} onChange={(v) => onChange('lineHeight', v)} format={(v) => v.toFixed(2)} />
      </div>
      <p className="mt-4 text-xs text-on-surface-variant">يغيّر «حجم الخط الأساسي» مقاس كل النصوص والمسافات تناسبيًا (14–20 بكسل). الحد الأدنى والأقصى يمنعان كسر الواجهات.</p>
    </Card>
  );
}

// ---------------- التنسيقات ----------------

function LayoutTab({ draft, onChange }: { draft: ThemeConfig; onChange: <K extends keyof NonNullable<ThemeConfig['layout']>>(k: K, v: NonNullable<ThemeConfig['layout']>[K]) => void }) {
  const l = { ...DEFAULT_LAYOUT, ...draft.layout };
  const shapes: { id: ButtonShape; label: string }[] = [
    { id: 'rounded', label: 'مستدير' },
    { id: 'pill', label: 'كبسولة' },
    { id: 'square', label: 'حاد' },
  ];
  return (
    <Card>
      <CardHeader title="التنسيقات" subtitle="الحواف والمسافات والظلال وشكل الأزرار" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Slider label="استدارة الحواف" {...LIMITS.radius} value={l.radius} onChange={(v) => onChange('radius', v)} format={(v) => `×${v.toFixed(2)}`} />
        <Slider label="كثافة المسافات" {...LIMITS.density} value={l.density} onChange={(v) => onChange('density', v)} format={(v) => `×${v.toFixed(2)}`} />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-on-surface">شكل الأزرار</span>
          <div className="flex gap-2">
            {shapes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onChange('buttonShape', s.id)}
                className={`flex-1 border px-3 py-2 text-sm font-medium transition-colors ${
                  l.buttonShape === s.id ? 'border-primary-600 bg-primary-600 text-white' : 'border-outline-variant bg-surface hover:border-primary-300'
                }`}
                style={{ borderRadius: s.id === 'pill' ? 9999 : s.id === 'square' ? 4 : 12 }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-outline-variant p-3">
          <input type="checkbox" checked={l.shadows} onChange={(e) => onChange('shadows', e.target.checked)} className="h-4 w-4 accent-primary-600" />
          <span className="text-sm font-medium text-on-surface">إظهار الظلال تحت البطاقات والأزرار</span>
        </label>
      </div>
    </Card>
  );
}

// ---------------- النصوص ----------------

function TextsTab({ texts, onChange }: { texts: Record<string, string>; onChange: (key: string, v: string) => void }) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string>('');
  const needle = q.trim();
  const entries = TEXT_REGISTRY.filter(
    (e) => (!group || e.group === group) && (!needle || e.def.includes(needle) || (texts[e.key] ?? '').includes(needle)),
  );
  const customized = TEXT_REGISTRY.filter((e) => texts[e.key]?.trim() && texts[e.key].trim() !== e.def).length;

  return (
    <Card>
      <CardHeader title="النصوص" subtitle={`عدّل عناوين الصفحات والأوصاف والرسائل الثابتة (${customized} نصًا معدَّلًا)`} />
      <p className="mb-3 rounded-xl bg-primary-50 px-3 py-2 text-xs text-primary-800">
        تتغيّر النصوص الثابتة فقط. أسماء الطلاب والدورات والكتب وبيانات الشهادات ونصوصها الرسمية لا تتأثر، ولا يمكن تخصيصها من هنا. اترك الحقل فارغًا أو اضغط «استرجاع» للعودة للنص الأصلي.
      </p>
      <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_220px]">
        <Input placeholder="ابحث في النصوص..." value={q} onChange={(e) => setQ(e.target.value)} icon={<Search size={18} />} />
        <select value={group} onChange={(e) => setGroup(e.target.value)} className="rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-sm" aria-label="القسم">
          <option value="">كل الأقسام</option>
          {TEXT_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div className="max-h-[60vh] divide-y divide-outline-variant overflow-y-auto rounded-xl border border-outline-variant">
        {entries.length === 0 && <p className="p-4 text-center text-sm text-on-surface-variant">لا نتائج.</p>}
        {entries.map((e) => {
          const value = texts[e.key] ?? '';
          const changed = value.trim() !== '' && value.trim() !== e.def;
          return (
            <div key={e.key} className="p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-on-surface-variant">{e.group} · الأصل: {e.def}</span>
                {changed && (
                  <button type="button" onClick={() => onChange(e.key, '')} className="shrink-0 text-xs text-primary-700 hover:underline">استرجاع</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={value}
                  maxLength={LIMITS.maxTextLength}
                  onChange={(ev) => onChange(e.key, ev.target.value)}
                  placeholder={e.def}
                  aria-label={e.def}
                  className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
                {changed && <Badge variant="primary">معدَّل</Badge>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------- المعاينة ----------------

function Preview() {
  return (
    <aside className="lg:sticky lg:top-20 lg:self-start">
      <Card padded={false} className="overflow-hidden">
        <div className="bg-primary-600 px-4 py-3 text-sm font-bold text-white">معاينة مباشرة</div>
        <div className="space-y-4 p-4">
          <div className="rounded-xl bg-primary-900 p-2 text-sm text-white">
            <div className="rounded-lg bg-primary-700 px-3 py-2 ring-1 ring-secondary-400/40">عنصر قائمة نشط</div>
            <div className="px-3 py-2 text-primary-100">عنصر قائمة</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">زر رئيسي</Button>
            <Button size="sm" variant="outlined">ثانوي</Button>
            <Button size="sm" variant="error">حذف</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">نجاح</Badge>
            <Badge variant="warning">تحذير</Badge>
            <Badge variant="error">خطأ</Badge>
            <Badge variant="primary">أساسي</Badge>
          </div>
          <ProgressBar value={68} color="primary" />
          <div className="rounded-2xl border border-secondary-200 bg-gradient-to-b from-secondary-50/70 to-primary-50/60 p-4 text-center">
            <p className="reading-text font-arabic text-xl font-bold text-primary-900">إنما الأعمال بالنيات</p>
            <p className="reading-text font-naskh mt-2 text-sm text-on-surface/90">شرح مختصر يظهر بخط الشرح المختار.</p>
          </div>
          <input
            readOnly
            value="حقل إدخال"
            aria-label="معاينة حقل"
            className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface"
          />
          <p className="text-xs text-on-surface-variant">نص ثانوي للأوصاف والتسميات الصغيرة.</p>
        </div>
      </Card>
    </aside>
  );
}
