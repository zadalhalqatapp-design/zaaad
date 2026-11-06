import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/api';
import type { MessageRecipient, UserRole } from '@/types';

const ROLE_GROUP: Record<UserRole, string> = { admin: 'الإدارة', supervisor: 'المشرفون', student: 'الطلاب' };

/** قائمة من يمكنني مراسلته. `failed` = الخادم لم يُحدَّث بعد (نعرض حقل المعرّف القديم كحل بديل). */
export function useRecipients(): { recipients: MessageRecipient[]; loading: boolean; failed: boolean } {
  const [state, setState] = useState<{ recipients: MessageRecipient[]; loading: boolean; failed: boolean }>({
    recipients: [], loading: true, failed: false,
  });
  useEffect(() => {
    let alive = true;
    api.getMessageRecipients()
      .then((r) => alive && setState({ recipients: r ?? [], loading: false, failed: false }))
      .catch(() => alive && setState({ recipients: [], loading: false, failed: true }));
    return () => { alive = false; };
  }, []);
  return state;
}

/**
 * اختيار مستلم بالاسم (بحث + مجموعات حسب الدور) بدل كتابة معرّف لا يعرفه المستخدم.
 * `roles` يقصر القائمة على أدوار معيّنة (مثلًا الطلاب فقط لإشعار موجَّه).
 */
export function RecipientPicker({
  label = 'إلى',
  value,
  onChange,
  recipients,
  failed,
  roles,
  extra,
}: {
  label?: string;
  value: string;
  onChange: (id: string) => void;
  recipients: MessageRecipient[];
  failed?: boolean;
  roles?: UserRole[];
  /** مستلم إضافي ليس في القائمة (مثل مرسل رسالة نردّ عليها). */
  extra?: MessageRecipient | null;
}) {
  const [q, setQ] = useState('');
  const all = useMemo(() => {
    const base = roles ? recipients.filter((r) => roles.includes(r.role)) : recipients;
    return extra && !base.some((r) => r.id === extra.id) ? [extra, ...base] : base;
  }, [recipients, roles, extra]);
  const shown = useMemo(() => {
    const needle = q.trim();
    const list = needle ? all.filter((r) => r.name.includes(needle)) : all;
    // لا نُخفي المحدَّد حاليًا حتى لو لم يطابق البحث
    const sel = all.find((r) => r.id === value);
    return sel && !list.some((r) => r.id === value) ? [sel, ...list] : list;
  }, [all, q, value]);

  if (failed) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-on-surface">{label} (معرّف)</label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="معرّف المستلم"
          className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
        <p className="text-xs text-on-surface-variant">قائمة الأسماء تتطلب تحديث الخادم (انظر ملف Communication.gs).</p>
      </div>
    );
  }

  const groups = (['admin', 'supervisor', 'student'] as UserRole[])
    .map((role) => ({ role, items: shown.filter((r) => r.role === role) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-on-surface">{label}</label>
      {all.length > 8 && (
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم..."
            className="w-full rounded-xl border border-outline-variant bg-surface py-2 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      >
        <option value="">اختر المستلم...</option>
        {groups.map((g) => (
          <optgroup key={g.role} label={ROLE_GROUP[g.role]}>
            {g.items.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {all.length === 0 && <p className="text-xs text-on-surface-variant">لا يوجد من يمكنك مراسلته حاليًا.</p>}
    </div>
  );
}
