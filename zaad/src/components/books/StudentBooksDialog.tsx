import { useEffect, useState } from 'react';
import { api } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type { Book, User } from '@/types';
import { Library } from 'lucide-react';

/** المشرف/المدير يحدد الكتب التي يراها طالب معيّن. */
export function StudentBooksDialog({ student, onClose }: { student: User | null; onClose: () => void }) {
  const { notify } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!student) return;
    let alive = true;
    setLoading(true);
    Promise.all([api.getBooks(), api.getBookAssignments(student.id)])
      .then(([allBooks, assignments]) => {
        if (!alive) return;
        setBooks(allBooks.filter((b) => b.status === 'active' || assignments.some((a) => a.bookId === b.id)));
        setChecked(new Set(assignments.map((a) => a.bookId)));
      })
      .catch((err) => {
        if (alive) notify(err instanceof Error ? err.message : 'تعذّر تحميل الكتب.', 'error');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!student) return;
    setSaving(true);
    try {
      await api.setStudentBooks(student.id, [...checked]);
      notify('تم حفظ كتب الطالب', 'success');
      onClose();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الحفظ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!student}
      onClose={onClose}
      title={student ? `كتب ${student.name}` : ''}
      actions={
        <>
          <Button variant="text" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} loading={saving} disabled={loading}>حفظ</Button>
        </>
      }
    >
      {loading ? (
        <p className="py-6 text-center text-sm text-on-surface-variant">جارٍ التحميل...</p>
      ) : books.length === 0 ? (
        <p className="py-6 text-center text-sm text-on-surface-variant">لا توجد كتب. يضيفها المدير من «إدارة الكتب».</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-on-surface-variant mb-2">
            يرى الطالب الكتب المحدَّدة فقط. إزالة كتاب لا تحذف تقدّمه المحفوظ.
          </p>
          {books.map((b) => (
            <label
              key={b.id}
              className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                checked.has(b.id) ? 'border-primary-400 bg-primary-50/60' : 'border-outline-variant hover:border-primary-300'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-primary-600"
                checked={checked.has(b.id)}
                onChange={() => toggle(b.id)}
              />
              <div className="flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <Library size={15} className="text-primary-600" /> {b.title}
                  {b.status === 'archived' && <span className="text-[11px] font-normal text-on-surface-variant">(مؤرشف)</span>}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {b.daysCount} يومًا · {b.itemsPerDay} يوميًا · {b.itemsCount ?? 0} عنصرًا
                </p>
              </div>
            </label>
          ))}
        </div>
      )}
    </Dialog>
  );
}
