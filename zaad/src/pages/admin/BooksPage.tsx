import { useEffect, useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Badge, EmptyState } from '@/components/ui/Badge';
import type { Book, BookAssignment, User } from '@/types';
import { Library, Plus, Pencil, Trash2, Users, Archive, ArchiveRestore } from 'lucide-react';

const emptyForm = { title: '', description: '', daysCount: '20', itemsPerDay: '2', autoAssign: false };

export function BooksPage() {
  const { notify } = useToast();
  const { data, loading, error, reload } = useAsync(() => api.getBooks(), []);
  const books = data || [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [assignTarget, setAssignTarget] = useState<Book | null>(null);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (b: Book) => {
    setEditing(b);
    setForm({
      title: b.title,
      description: b.description || '',
      daysCount: String(b.daysCount),
      itemsPerDay: String(b.itemsPerDay),
      autoAssign: b.autoAssign,
    });
    setFormOpen(true);
  };

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setSaving(true);
    try {
      await fn();
      notify(okMsg, 'success');
      reload();
      return true;
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشلت العملية.', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const days = Number(form.daysCount);
    const per = Number(form.itemsPerDay);
    if (!form.title.trim()) return notify('عنوان الكتاب مطلوب.', 'warning');
    if (!Number.isInteger(days) || days < 1 || !Number.isInteger(per) || per < 1) {
      return notify('عدد الأيام وعدد العناصر يوميًا يجب أن يكونا أرقامًا صحيحة موجبة.', 'warning');
    }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      daysCount: days,
      itemsPerDay: per,
      autoAssign: form.autoAssign,
    };
    const ok = await run(
      () => (editing ? api.updateBook(editing.id, payload) : api.addBook(payload)),
      editing ? 'تم تحديث الكتاب' : 'تمت إضافة الكتاب',
    );
    if (ok) setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await run(() => api.deleteBook(deleteTarget.id), 'تم حذف الكتاب');
    if (ok) setDeleteTarget(null);
  };

  const toggleArchive = (b: Book) =>
    run(() => api.updateBook(b.id, { status: b.status === 'active' ? 'archived' : 'active' }),
      b.status === 'active' ? 'تمت أرشفة الكتاب' : 'تمت إعادة تفعيل الكتاب');

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="إدارة الكتب"
        subtitle="كتب الحفظ في البرنامج — لكل كتاب عدد أيام وعناصر يوميًا"
        action={<Button icon={<Plus size={18} />} onClick={openAdd}>إضافة كتاب</Button>}
      />

      {error ? (
        <Card>
          <EmptyState
            icon={<Library size={40} />}
            title="تعذّر تحميل الكتب"
            description="تأكد من تحديث سكربت Apps Script وتشغيل setupBooks() مرة واحدة (انظر gs/README.md)."
          />
        </Card>
      ) : books.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Library size={40} />}
            title="لا توجد كتب"
            action={<Button onClick={openAdd} icon={<Plus size={18} />}>إضافة كتاب</Button>}
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {books.map((b) => (
            <Card key={b.id} className={b.status === 'archived' ? 'opacity-70' : ''}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-on-surface flex items-center gap-2">
                    <Library size={18} className="text-primary-600 shrink-0" />
                    <span className="truncate">{b.title}</span>
                  </h3>
                  {b.description && <p className="mt-1 text-sm text-on-surface-variant line-clamp-2">{b.description}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {b.status === 'archived' && <Badge variant="neutral">مؤرشف</Badge>}
                  {b.autoAssign && <Badge variant="info">تعيين تلقائي</Badge>}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Mini label="يومًا" value={b.daysCount} />
                <Mini label="عناصر يوميًا" value={b.itemsPerDay} />
                <Mini label="عنصرًا" value={b.itemsCount ?? 0} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3">
                <Button size="sm" variant="outlined" icon={<Users size={15} />} onClick={() => setAssignTarget(b)}>
                  الطلاب ({b.assignedCount ?? 0})
                </Button>
                <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-surface-dim text-on-surface-variant" title="تعديل"><Pencil size={16} /></button>
                <button onClick={() => toggleArchive(b)} className="p-1.5 rounded-lg hover:bg-surface-dim text-on-surface-variant" title={b.status === 'active' ? 'أرشفة' : 'إعادة تفعيل'}>
                  {b.status === 'active' ? <Archive size={16} /> : <ArchiveRestore size={16} />}
                </button>
                {b.id !== 'book_default' && (
                  <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg hover:bg-error-50 text-error-600" title="حذف"><Trash2 size={16} /></button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'تعديل الكتاب' : 'إضافة كتاب'}
        actions={
          <>
            <Button variant="text" onClick={() => setFormOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} loading={saving}>حفظ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="عنوان الكتاب" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: الأربعون القرآنية" />
          <Textarea label="وصف مختصر (اختياري)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="عدد الأيام" type="number" min={1} value={form.daysCount} onChange={(e) => setForm({ ...form, daysCount: e.target.value })} />
            <Input label="عناصر كل يوم" type="number" min={1} value={form.itemsPerDay} onChange={(e) => setForm({ ...form, itemsPerDay: e.target.value })} />
          </div>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary-600" checked={form.autoAssign} onChange={(e) => setForm({ ...form, autoAssign: e.target.checked })} />
            <span>
              <span className="font-medium text-on-surface">تعيين تلقائي للطلاب الجدد</span>
              <span className="block text-xs text-on-surface-variant">يُعيَّن الكتاب لكل طالب عند اعتماده. الافتراضي: يعيّن المشرف يدويًا.</span>
            </span>
          </label>
        </div>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="تأكيد الحذف"
        actions={
          <>
            <Button variant="text" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button variant="error" onClick={handleDelete} loading={saving}>حذف</Button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant">
          هل تريد حذف «{deleteTarget?.title}»؟ لا يمكن حذف كتاب يحتوي على عناصر — احذف عناصره أولًا أو أرشفه بدلًا من ذلك.
        </p>
      </Dialog>

      <BookStudentsDialog book={assignTarget} onClose={() => setAssignTarget(null)} onSaved={reload} />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-dim p-2">
      <p className="text-lg font-bold text-primary-700">{value}</p>
      <p className="text-[11px] text-on-surface-variant">{label}</p>
    </div>
  );
}

/** تعيين كتاب لعدة طلاب دفعة واحدة. */
function BookStudentsDialog({ book, onClose, onSaved }: { book: Book | null; onClose: () => void; onSaved: () => void }) {
  const { notify } = useToast();
  const [students, setStudents] = useState<User[]>([]);
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!book) return;
    let alive = true;
    setLoading(true);
    setSearch('');
    Promise.all([api.getStudents(), api.getBookAssignments()])
      .then(([all, assignments]: [User[], BookAssignment[]]) => {
        if (!alive) return;
        setStudents(all.filter((s) => s.status === 'approved' || s.status === 'suspended'));
        const ids = new Set(assignments.filter((a) => a.bookId === book.id).map((a) => a.studentId));
        setInitial(ids);
        setChecked(new Set(ids));
      })
      .catch((err) => { if (alive) notify(err instanceof Error ? err.message : 'تعذّر التحميل.', 'error'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id]);

  const visible = students.filter((s) => s.name.includes(search) || s.email.includes(search));
  const toggle = (id: string) =>
    setChecked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const save = async () => {
    if (!book) return;
    const addIds = [...checked].filter((id) => !initial.has(id));
    const removeIds = [...initial].filter((id) => !checked.has(id));
    if (addIds.length === 0 && removeIds.length === 0) return onClose();
    setSaving(true);
    try {
      await api.updateBookAssignments(book.id, addIds, removeIds);
      notify('تم تحديث طلاب الكتاب', 'success');
      onSaved();
      onClose();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الحفظ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!book}
      onClose={onClose}
      title={book ? `طلاب «${book.title}»` : ''}
      size="lg"
      actions={
        <>
          <Button variant="text" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} loading={saving} disabled={loading}>حفظ</Button>
        </>
      }
    >
      {loading ? (
        <p className="py-6 text-center text-sm text-on-surface-variant">جارٍ التحميل...</p>
      ) : (
        <>
          <Input placeholder="بحث بالاسم أو البريد..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <p className="mt-2 text-xs text-on-surface-variant">
            المحدَّد {checked.size} من {students.length}. يبدأ الكتاب لكل طالب جديد من يوم تعيينه.
          </p>
          <div className="mt-3 max-h-[45vh] space-y-1 overflow-y-auto">
            {visible.map((s) => (
              <label key={s.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-dim cursor-pointer">
                <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={checked.has(s.id)} onChange={() => toggle(s.id)} />
                <span className="text-sm text-on-surface">{s.name}</span>
                <span className="text-xs text-on-surface-variant" dir="ltr">{s.email}</span>
              </label>
            ))}
            {visible.length === 0 && <p className="py-4 text-center text-sm text-on-surface-variant">لا يوجد طلاب.</p>}
          </div>
        </>
      )}
    </Dialog>
  );
}
