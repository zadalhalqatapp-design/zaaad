import { useEffect, useState } from 'react';
import { api } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import type { Achievement } from '@/types';
import { BadgeCheck, Undo2 } from 'lucide-react';

export const GRADE_PRESETS = ['ممتاز', 'جيد جدًا', 'جيد', 'مقبول'];

/**
 * المشرف يعتمد إنجاز الطالب في كتاب ويكتب تقدير الدرجة؛
 * ولا يستطيع المدير إصدار الشهادة قبل هذا الاعتماد، وتحمل الشهادة هذا التقدير.
 */
export function AchievementApproval({
  studentId,
  bookId,
  bookTitle,
  overall,
}: {
  studentId: string;
  bookId?: string;
  bookTitle?: string;
  overall: number;
}) {
  const { notify } = useToast();
  const [current, setCurrent] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grade, setGrade] = useState('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.getAchievements(studentId, bookId);
      const a = list[0] || null;
      setCurrent(a);
      setGrade(a?.grade || '');
      setNotes(a?.notes || '');
    } catch {
      setCurrent(null); // خادم قديم بلا الميزة: لا نعرض خطأ مزعجًا
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, bookId]);

  const approve = async () => {
    if (!grade.trim()) {
      notify('اكتب تقدير الدرجة أولًا.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await api.approveAchievement(studentId, bookId, grade.trim(), notes.trim());
      notify(current ? 'تم تحديث الاعتماد' : 'تم اعتماد الإنجاز', 'success');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الاعتماد.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const revoke = async () => {
    if (!confirm('إلغاء اعتماد الإنجاز؟')) return;
    setSaving(true);
    try {
      await api.revokeAchievement(studentId, bookId);
      notify('تم إلغاء الاعتماد', 'success');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الإلغاء.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="mt-5 text-sm text-on-surface-variant">جارٍ تحميل حالة الاعتماد...</p>;

  return (
    <div className="mt-5 rounded-2xl border border-primary-200 bg-primary-50/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-semibold text-on-surface">
          <BadgeCheck size={18} className="text-primary-600" /> اعتماد الإنجاز{bookTitle ? ` — ${bookTitle}` : ''}
        </h4>
        {current ? (
          <Badge variant="success">معتمد: {current.grade}</Badge>
        ) : (
          <Badge variant="warning">بانتظار الاعتماد</Badge>
        )}
      </div>

      {current && (
        <p className="mb-3 text-xs text-on-surface-variant">
          اعتمده {current.approvedBy || '—'} بنسبة {current.progressPercent}% بتاريخ {String(current.approvedAt).split('T')[0]}.
          الشهادة ستحمل هذه النسبة وهذا التقدير.
        </p>
      )}

      <div className="mb-2 flex flex-wrap gap-2">
        {GRADE_PRESETS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGrade(g)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              grade === g ? 'border-primary-600 bg-primary-600 text-white' : 'border-outline-variant bg-surface hover:border-primary-300'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="تقدير الدرجة" value={grade} maxLength={40} onChange={(e) => setGrade(e.target.value)} placeholder="مثال: ممتاز، أو 95/100" />
        <Textarea label="ملاحظات (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[44px]" rows={1} />
      </div>
      <p className="mt-2 text-xs text-on-surface-variant">نسبة الإنجاز الحالية {Math.round(overall)}% تُسجَّل مع الاعتماد.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button icon={<BadgeCheck size={16} />} onClick={approve} loading={saving}>
          {current ? 'تحديث الاعتماد' : 'اعتماد الإنجاز'}
        </Button>
        {current && (
          <Button variant="outlined" icon={<Undo2 size={16} />} onClick={revoke} disabled={saving}>
            إلغاء الاعتماد
          </Button>
        )}
      </div>
    </div>
  );
}
