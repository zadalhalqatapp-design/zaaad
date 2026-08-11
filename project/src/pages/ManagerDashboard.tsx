import { useCallback, useEffect, useState } from 'react';
import { archiveBook, createBook, createProgram, listBooks, listPrograms, listUsers, togglePublish, updateUserStatus } from '@/api';
import { useAuth } from '@/lib/auth';
import { LoadingState, EmptyState, ErrorState, StatusBadge } from '@/components/ui/Feedback';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { BookOpen, Layers, Users, ClipboardList, Plus, BookMarked, UserCheck, UserX, Archive } from 'lucide-react';
import type { Book, Program, Profile } from '@/lib/types';

type Tab = 'overview' | 'books' | 'programs' | 'approvals';

export function ManagerDashboard() {
  const { profile } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('overview');

  const [counts, setCounts] = useState<{ students: number; supervisors: number; programs: number; books: number; pending: number } | null>(null);
  const [pending, setPending] = useState<Profile[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bookModal, setBookModal] = useState(false);
  const [programModal, setProgramModal] = useState(false);
  const [savingBook, setSavingBook] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);
  const [confirmId, setConfirmId] = useState<{ id: string; action: 'approve' | 'reject' | 'suspend' } | null>(null);

  const [bookForm, setBookForm] = useState({ title: '', author: '', description: '', category: '', content_type: 'text', is_public: false });
  const [programForm, setProgramForm] = useState({ name: '', description: '', program_type: 'course', daily_units: 2, passing_score: 70 });

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const [users, nextPrograms, nextBooks] = await Promise.all([
        listUsers(),
        listPrograms(),
        listBooks(),
      ]);
      const pendingUsers = users.filter((user) => user.status === 'pending');
      setCounts({
        students: users.filter((user) => user.role === 'student').length,
        supervisors: users.filter((user) => user.role === 'supervisor').length,
        programs: nextPrograms.length,
        books: nextBooks.length,
        pending: pendingUsers.length,
      });
      setPrograms(nextPrograms);
      setBooks(nextBooks);
      setPending(pendingUsers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل لوحة المدير.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const createBook = async () => {
    setSavingBook(true);
    try {
      await createBook({
        title: bookForm.title.trim(),
        author: bookForm.author.trim() || undefined,
        description: bookForm.description.trim() || undefined,
        category: bookForm.category.trim() || undefined,
        content_type: bookForm.content_type,
        is_public: bookForm.is_public,
      });
      toast('success', 'تم إنشاء الكتاب.');
      setBookModal(false);
      setBookForm({ title: '', author: '', description: '', category: '', content_type: 'text', is_public: false });
      await load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'تعذر إنشاء الكتاب.');
    } finally {
      setSavingBook(false);
    }
  };

  const createProgram = async () => {
    setSavingProgram(true);
    try {
      await createProgram({
        name: programForm.name.trim(),
        description: programForm.description.trim() || undefined,
        programType: programForm.program_type,
        rules: { daily_units: programForm.daily_units, passing_score: programForm.passing_score, allow_adaptive_plan: true },
      });
      toast('success', 'تم إنشاء البرنامج كمسودة.');
      setProgramModal(false);
      setProgramForm({ name: '', description: '', program_type: 'course', daily_units: 2, passing_score: 70 });
      await load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'تعذر إنشاء البرنامج.');
    } finally {
      setSavingProgram(false);
    }
  };

  const archiveBook = async (id: string) => {
    try {
      await archiveBook(id);
      toast('success', 'تمت أرشفة الكتاب.');
      await load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'تعذر أرشفة الكتاب.');
    }
  };

  const togglePublish = async (p: Program) => {
    try {
      await togglePublish(p.id, !p.published);
      toast('success', p.published ? 'تم إلغاء نشر البرنامج.' : 'تم نشر البرنامج.');
      await load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'تعذر تغيير حالة النشر.');
    }
  };

  const resolvePending = async (id: string, action: 'approve' | 'reject' | 'suspend') => {
    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'suspended';
    try {
      await updateUserStatus(id, status);
      toast('success', action === 'approve' ? 'تم اعتماد الحساب.' : action === 'reject' ? 'تم رفض الطلب.' : 'تم إيقاف الحساب.');
      await load();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'تعذر تحديث حالة الحساب.');
    }
  };

  if (loading) return <LoadingState label="جارٍ تحميل لوحة المدير…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100">لوحة المدير</h1>
        <p className="text-sm text-primary-500 dark:text-primary-400">إدارة المنصة: الكتب والبرامج والحسابات.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-primary-100/60 dark:bg-primary-800/40 p-1">
        {([
          { key: 'overview', label: 'نظرة عامة', icon: Layers },
          { key: 'books', label: 'الكتب', icon: BookMarked },
          { key: 'programs', label: 'البرامج', icon: BookOpen },
          { key: 'approvals', label: 'طلبات التسجيل', icon: ClipboardList },
        ] as { key: Tab; label: string; icon: typeof Layers }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
              tab === t.key ? 'bg-white dark:bg-primary-900 text-primary-700 dark:text-primary-100 shadow-soft' : 'text-primary-500 dark:text-primary-300 hover:text-primary-700'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.key === 'approvals' && counts && counts.pending > 0 && (
              <span className="badge bg-gold-500 text-primary-900 text-[10px] px-1.5">{counts.pending}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && counts && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard icon={Users} label="الطلاب" value={counts.students} />
          <StatCard icon={UserCheck} label="المشرفون" value={counts.supervisors} />
          <StatCard icon={BookOpen} label="البرامج" value={counts.programs} />
          <StatCard icon={BookMarked} label="الكتب" value={counts.books} />
          <StatCard icon={ClipboardList} label="طلبات بانتظار الموافقة" value={counts.pending} tone="warning" />
          <StatCard icon={Layers} label="المنشور من البرامج" value={programs.filter((p) => p.published).length} />
        </div>
      )}

      {tab === 'books' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">مكتبة الكتب</h2>
            <button onClick={() => setBookModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> إضافة كتاب</button>
          </div>
          {books.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((b) => (
                <div key={b.id} className="card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-primary-800 dark:text-primary-100 truncate">{b.title}</h3>
                      <p className="text-xs text-primary-500 dark:text-primary-400">{b.author ?? 'بدون مؤلف'}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  {b.description && <p className="text-sm text-primary-600 dark:text-primary-300 mt-2 line-clamp-2">{b.description}</p>}
                  <div className="flex items-center gap-2 mt-3 text-xs text-primary-500 dark:text-primary-400">
                    <span className="badge bg-primary-100 dark:bg-primary-800/60 text-primary-700 dark:text-primary-200">{b.content_type}</span>
                    {b.is_public && <span className="badge bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-200">عام</span>}
                  </div>
                  {b.status === 'active' && (
                    <button onClick={() => archiveBook(b.id)} className="btn-ghost mt-3 text-xs py-1.5 text-error-600 dark:text-error-300">
                      <Archive className="h-3.5 w-3.5" /> أرشفة
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-6"><EmptyState icon={BookMarked} title="لا توجد كتب بعد" description="أنشئ أول كتاب لإضافة وحداته ومحتواه." action={<button onClick={() => setBookModal(true)} className="btn-primary mt-2"><Plus className="h-4 w-4" /> إضافة كتاب</button>} /></div>
          )}
        </section>
      )}

      {tab === 'programs' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">البرامج</h2>
            <button onClick={() => setProgramModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> إنشاء برنامج</button>
          </div>
          {programs.length > 0 ? (
            <div className="card divide-y divide-primary-100/60 dark:divide-primary-800/60">
              {programs.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-primary-800 dark:text-primary-100 truncate">{p.name}</h3>
                    <p className="text-xs text-primary-500 dark:text-primary-400">
                      {p.program_type} · {p.rules.daily_units ?? 2} وحدات/يوم · نجاح {p.rules.passing_score ?? 70}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge ${p.published ? 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-200' : 'bg-primary-100/60 text-primary-500 dark:bg-primary-800/40 dark:text-primary-400'}`}>
                      {p.published ? 'منشور' : 'مسودة'}
                    </span>
                    <button onClick={() => togglePublish(p)} className="btn-outline text-xs py-1.5 px-3">
                      {p.published ? 'إلغاء النشر' : 'نشر'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-6"><EmptyState icon={BookOpen} title="لا توجد برامج بعد" description="أنشئ برنامجًا واربطه بكتاب وحدد قواعده." action={<button onClick={() => setProgramModal(true)} className="btn-primary mt-2"><Plus className="h-4 w-4" /> إنشاء برنامج</button>} /></div>
          )}
        </section>
      )}

      {tab === 'approvals' && (
        <section>
          <h2 className="section-title mb-3">طلبات التسجيل</h2>
          {pending.length > 0 ? (
            <div className="card divide-y divide-primary-100/60 dark:divide-primary-800/60">
              {pending.map((p) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium text-primary-800 dark:text-primary-100">{p.full_name}</p>
                    <p className="text-xs text-primary-500 dark:text-primary-400">{p.email} · {roleLabel(p.role)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setConfirmId({ id: p.id, action: 'approve' })} className="btn-primary text-xs py-1.5 px-3"><UserCheck className="h-3.5 w-3.5" /> قبول</button>
                    <button onClick={() => setConfirmId({ id: p.id, action: 'reject' })} className="btn text-xs py-1.5 px-3 bg-error-100 text-error-700 dark:bg-error-900/40 dark:text-error-200 hover:bg-error-200"><UserX className="h-3.5 w-3.5" /> رفض</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-6"><EmptyState icon={ClipboardList} title="لا توجد طلبات بانتظار الموافقة" /></div>
          )}
        </section>
      )}

      <Modal open={bookModal} onClose={() => setBookModal(false)} title="إضافة كتاب">
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="bk-title">عنوان الكتاب</label>
            <input id="bk-title" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} className="input" placeholder="مثال: الأربعون النووية" />
          </div>
          <div>
            <label className="label" htmlFor="bk-author">المؤلف</label>
            <input id="bk-author" value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} className="input" placeholder="اسم المؤلف" />
          </div>
          <div>
            <label className="label" htmlFor="bk-desc">الوصف</label>
            <textarea id="bk-desc" value={bookForm.description} onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })} className="input" rows={3} placeholder="وصف مختصر" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="bk-cat">التصنيف</label>
              <input id="bk-cat" value={bookForm.category} onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })} className="input" placeholder="حديث / قرآن / متن" />
            </div>
            <div>
              <label className="label" htmlFor="bk-type">نوع المحتوى</label>
              <select id="bk-type" value={bookForm.content_type} onChange={(e) => setBookForm({ ...bookForm, content_type: e.target.value })} className="input">
                <option value="text">نص</option>
                <option value="audio">صوت</option>
                <option value="video">فيديو</option>
                <option value="pdf">PDF</option>
                <option value="mixed">مختلط</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-primary-700 dark:text-primary-200">
            <input type="checkbox" checked={bookForm.is_public} onChange={(e) => setBookForm({ ...bookForm, is_public: e.target.checked })} className="rounded border-primary-300" />
            كتاب عام (ظاهر للجميع)
          </label>
          <button onClick={createBook} disabled={savingBook || !bookForm.title.trim()} className="btn-primary w-full">
            {savingBook ? 'جارٍ الحفظ…' : 'حفظ الكتاب'}
          </button>
        </div>
      </Modal>

      <Modal open={programModal} onClose={() => setProgramModal(false)} title="إنشاء برنامج">
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="pr-name">اسم البرنامج</label>
            <input id="pr-name" value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} className="input" placeholder="مثال: حفظ 40 حديثًا في 20 يومًا" />
          </div>
          <div>
            <label className="label" htmlFor="pr-desc">الوصف</label>
            <textarea id="pr-desc" value={programForm.description} onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })} className="input" rows={3} placeholder="وصف البرنامج وأهدافه" />
          </div>
          <div>
            <label className="label" htmlFor="pr-type">نوع البرنامج</label>
            <select id="pr-type" value={programForm.program_type} onChange={(e) => setProgramForm({ ...programForm, program_type: e.target.value })} className="input">
              <option value="course">دورة</option>
              <option value="summer">صيفي</option>
              <option value="ramadan">رمضاني</option>
              <option value="weekly">أسبوعي</option>
              <option value="open">مفتوح</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="pr-units">الوحدات اليومية</label>
              <input id="pr-units" type="number" min={1} max={20} value={programForm.daily_units} onChange={(e) => setProgramForm({ ...programForm, daily_units: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="pr-pass">درجة النجاح (%)</label>
              <input id="pr-pass" type="number" min={0} max={100} value={programForm.passing_score} onChange={(e) => setProgramForm({ ...programForm, passing_score: Number(e.target.value) })} className="input" />
            </div>
          </div>
          <button onClick={createProgram} disabled={savingProgram || !programForm.name.trim()} className="btn-primary w-full">
            {savingProgram ? 'جارٍ الحفظ…' : 'إنشاء كمسودة'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && resolvePending(confirmId.id, confirmId.action)}
        title={confirmId?.action === 'approve' ? 'اعتماد الحساب' : 'رفض الطلب'}
        message={confirmId?.action === 'approve' ? 'سيتمكن المستخدم من الدخول بعد الاعتماد.' : 'لن يتمكن المستخدم من الدخول. يمكنك التراجع لاحقًا.'}
        confirmLabel={confirmId?.action === 'approve' ? 'اعتماد' : 'رفض'}
        danger={confirmId?.action !== 'approve'}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Layers; label: string; value: number; tone?: 'warning' }) {
  const colors = tone === 'warning' ? 'text-gold-600 dark:text-gold-300 bg-gold-50 dark:bg-gold-900/30' : 'text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-800/50';
  return (
    <div className="card p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors} mb-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-primary-800 dark:text-primary-100">{value}</p>
      <p className="text-sm text-primary-500 dark:text-primary-400">{label}</p>
    </div>
  );
}

function roleLabel(role: string) {
  if (role === 'manager') return 'مدير';
  if (role === 'supervisor') return 'مشرف';
  return 'طالب';
}
