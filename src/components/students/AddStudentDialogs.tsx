import { useMemo, useState } from 'react';
import { Copy, KeyRound, Search, UserPlus, Users } from 'lucide-react';
import { api } from '@/api';
import { useAsync } from '@/hooks/useAsync';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import type { Cycle } from '@/types';

/** كلمة مرور مؤقتة مقروءة (بلا حروف ملتبسة) يولّدها العميل لتُعرض قبل الحفظ. */
function suggestPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = 'zad';
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** الدورات المتاحة لهذا المستخدم: للمدير كلها، وللمشرف دورته المسندة فقط (الخادم يرشّحها). */
  cycles: Cycle[];
  isAdmin: boolean;
  onDone: () => void;
}

/** إنشاء حساب طالب بنفس بيانات التسجيل، معتمدًا ومسندًا لدورة مباشرة. */
export function CreateStudentDialog({ open, onClose, cycles, isAdmin, onDone }: Props) {
  const { notify } = useToast();
  const activeCycles = cycles.filter((c) => c.status === 'active');
  const choices = isAdmin ? cycles : activeCycles.length ? activeCycles : cycles;
  const [form, setForm] = useState({ name: '', email: '', phone: '', gender: '' as '' | 'male' | 'female', password: '', cycleId: '' });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string; name: string } | null>(null);

  const cycleId = form.cycleId || (choices.length === 1 ? choices[0].id : '');
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const reset = () => {
    setForm({ name: '', email: '', phone: '', gender: '', password: '', cycleId: '' });
    setCreated(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!form.name.trim()) return notify('اكتب اسم الطالب.', 'warning');
    if (!/^[^\s@]+@[^\s@]+$/.test(form.email.trim())) return notify('اكتب بريدًا إلكترونيًا صحيحًا.', 'warning');
    if (!form.gender) return notify('اختر الجنس (ذكر / أنثى).', 'warning');
    if (form.password && form.password.length < 6) return notify('كلمة المرور يجب ألا تقل عن 6 أحرف.', 'warning');
    if (!isAdmin && !cycleId) return notify('اختر الدورة.', 'warning');
    setSaving(true);
    try {
      const res = await api.createStudent({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        gender: form.gender,
        password: form.password || undefined,
        cycleId: cycleId || undefined,
      });
      setCreated({ email: res.email, password: res.tempPassword || form.password, name: form.name.trim() });
      onDone();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذّر إنشاء الحساب.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copyCreds = async () => {
    if (!created) return;
    const text = `زاد الحلقات\nالبريد: ${created.email}\nكلمة المرور: ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      notify('نُسخت بيانات الدخول', 'success');
    } catch {
      notify('تعذّر النسخ — انسخها يدويًا.', 'warning');
    }
  };

  if (created) {
    return (
      <Dialog open={open} onClose={close} title="تم إنشاء الحساب" actions={<Button onClick={close}>تم</Button>}>
        <p className="mb-3 text-sm text-on-surface-variant">
          حساب <strong className="text-on-surface">{created.name}</strong> جاهز ومعتمد. سلّمه بيانات الدخول التالية، وليغيّر كلمة المرور بعد أول دخول:
        </p>
        <div dir="ltr" className="space-y-1 rounded-xl bg-primary-50 px-4 py-3 font-mono text-sm text-primary-800 select-all">
          <p>{created.email}</p>
          <p className="text-lg font-bold tracking-wider">{created.password}</p>
        </div>
        <Button variant="outlined" size="sm" className="mt-3" icon={<Copy size={16} />} onClick={copyCreds}>نسخ البيانات</Button>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="إضافة طالب"
      size="md"
      actions={
        <>
          <Button variant="text" onClick={close}>إلغاء</Button>
          <Button onClick={submit} loading={saving} icon={<UserPlus size={18} />}>إنشاء الحساب</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="الاسم الكامل" value={form.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" />
        <Input label="البريد الإلكتروني (للدخول)" type="email" dir="ltr" value={form.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" />
        <Input label="رقم الجوال (اختياري)" type="tel" dir="ltr" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
        <div>
          <p className="mb-1.5 text-sm font-medium text-on-surface">الجنس</p>
          <div className="flex gap-2">
            {([['male', 'ذكر'], ['female', 'أنثى']] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => set({ gender: v })}
                className={`flex-1 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  form.gender === v ? 'border-primary-600 bg-primary-600 text-white' : 'border-outline-variant bg-surface hover:border-primary-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="كلمة المرور (اتركها فارغة لتوليد مؤقتة)"
          dir="ltr"
          value={form.password}
          onChange={(e) => set({ password: e.target.value })}
          autoComplete="new-password"
          trailing={
            <button type="button" title="اقتراح كلمة مرور" onClick={() => set({ password: suggestPassword() })} className="rounded-lg p-1.5 text-primary-700 hover:bg-primary-50">
              <KeyRound size={16} />
            </button>
          }
        />
        <Select
          label={isAdmin ? 'الدورة (اختياري)' : 'الدورة'}
          value={cycleId}
          onChange={(e) => set({ cycleId: e.target.value })}
        >
          {isAdmin && <option value="">— بلا دورة —</option>}
          {!isAdmin && choices.length > 1 && <option value="">— اختر الدورة —</option>}
          {choices.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.status === 'active' ? '' : ' (منتهية)'}</option>
          ))}
        </Select>
        {!isAdmin && choices.length === 0 && (
          <p className="rounded-xl bg-warning-50 px-3 py-2 text-xs text-warning-600">لم تُسنَد إليك دورة بعد؛ اطلب من المدير إسناد دورة لك.</p>
        )}
      </div>
    </Dialog>
  );
}

/** ضمّ طلاب موجودين بلا دورة (مسجَّلين أو معتمدين) إلى دورة. */
export function AddExistingDialog({ open, onClose, cycles, isAdmin, onDone }: Props) {
  const { notify } = useToast();
  const { data, loading, reload } = useAsync(() => (open ? api.getUnassignedStudents() : Promise.resolve([])), [open]);
  const choices = isAdmin ? cycles : cycles.filter((c) => c.status === 'active').length ? cycles.filter((c) => c.status === 'active') : cycles;
  const [cycleId, setCycleId] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const target = cycleId || (choices.length === 1 ? choices[0].id : '');
  const list = useMemo(() => (data ?? []).filter((s) => !q.trim() || s.name.includes(q.trim()) || s.email.includes(q.trim())), [data, q]);
  const ids = Object.keys(picked).filter((id) => picked[id]);

  const submit = async () => {
    if (!target) return notify('اختر الدورة أولًا.', 'warning');
    if (ids.length === 0) return notify('اختر طالبًا واحدًا على الأقل.', 'warning');
    setSaving(true);
    let ok = 0;
    const failed: string[] = [];
    for (const id of ids) {
      try {
        await api.setStudentCycle(id, target);
        ok++;
      } catch (e) {
        failed.push(e instanceof Error ? e.message : 'فشل');
      }
    }
    setSaving(false);
    notify(failed.length ? `أُضيف ${ok} وتعذّر ${failed.length}: ${failed[0]}` : `أُضيف ${ok} طالب إلى الدورة`, failed.length ? 'warning' : 'success');
    setPicked({});
    reload();
    onDone();
    if (!failed.length) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="إضافة طلاب إلى دورة"
      size="lg"
      actions={
        <>
          <Button variant="text" onClick={onClose}>إغلاق</Button>
          <Button onClick={submit} loading={saving} icon={<Users size={18} />} disabled={ids.length === 0}>
            إضافة المحدَّدين ({ids.length})
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="الدورة" value={target} onChange={(e) => setCycleId(e.target.value)}>
          {choices.length !== 1 && <option value="">— اختر الدورة —</option>}
          {choices.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.status === 'active' ? '' : ' (منتهية)'}</option>
          ))}
        </Select>
        <Input placeholder="ابحث بالاسم أو البريد..." value={q} onChange={(e) => setQ(e.target.value)} icon={<Search size={18} />} />
        <div className="max-h-72 divide-y divide-outline-variant overflow-y-auto rounded-xl border border-outline-variant">
          {loading && <p className="p-4 text-center text-sm text-on-surface-variant">جارٍ التحميل...</p>}
          {!loading && list.length === 0 && <p className="p-4 text-center text-sm text-on-surface-variant">لا يوجد طلاب بلا دورة.</p>}
          {list.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-surface-dim">
              <input type="checkbox" checked={!!picked[s.id]} onChange={() => setPicked((p) => ({ ...p, [s.id]: !p[s.id] }))} className="h-4 w-4 accent-primary-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-on-surface">{s.name}</span>
                <span className="block truncate text-xs text-on-surface-variant" dir="ltr">{s.email}</span>
              </span>
              {s.status === 'pending' && <span className="shrink-0 rounded-full bg-warning-50 px-2 py-0.5 text-xs text-warning-600">قيد المراجعة</span>}
            </label>
          ))}
        </div>
        <p className="text-xs text-on-surface-variant">
          {isAdmin ? 'يمكنك إسناد الطالب لأي دورة، ونقله بين الدورات من عمود «الدورة» في الجدول.' : 'تُضاف الطلاب إلى دورتك المسندة فقط. الطالب المسجَّل حديثًا يظهر في «طلبات التسجيل» لتعتمده بعد ضمّه.'}
        </p>
      </div>
    </Dialog>
  );
}
