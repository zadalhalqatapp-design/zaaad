import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, EmptyState } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { Input, Select } from '@/components/ui/Input';
import { bookStats } from '@/lib/books';
import { AchievementApproval } from '@/components/books/AchievementApproval';
import type { User, ProgressRecord, Hadith, Book } from '@/types';
import { APPS_CONFIG } from '@/config';
import { Search, BookMarked, Headphones, FileText, Users } from 'lucide-react';

export function StudentProgressPage() {
  const { data: studentsData, loading } = useAsync(() => api.getStudents() as Promise<User[]>, []);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const students = (studentsData || []).filter((s) => s.status === 'approved');
  const filtered = students.filter((s) => s.name.includes(search) || s.email.includes(search));

  const selected = students.find((s) => s.id === selectedId);

  return (
    <div className="animate-fade-in">
      <PageHeader title="إنجاز الطلاب" subtitle="متابعة تقدّم الطلاب في البرنامج" />

      {loading ? (
        <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>
      ) : students.length === 0 ? (
        <Card><EmptyState icon={<Users size={40} />} title="لا يوجد طلاب معتمدون" /></Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader title="قائمة الطلاب" />
            <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={18} />} />
            <div className="mt-3 space-y-1 max-h-[60vh] overflow-y-auto">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-right p-3 rounded-xl transition-all ${selectedId === s.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-surface-dim border border-transparent'}`}
                >
                  <p className="text-sm font-medium text-on-surface">{s.name}</p>
                  <p className="text-xs text-on-surface-variant" dir="ltr">{s.email}</p>
                </button>
              ))}
            </div>
          </Card>

          <div className="lg:col-span-2">
            {selected ? (
              <StudentProgressDetail studentId={selected.id} studentName={selected.name} />
            ) : (
              <Card><EmptyState icon={<BookMarked size={40} />} title="اختر طالبًا" description="حدد طالبًا من القائمة لعرض تقدّمه" /></Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StudentProgressDetail({ studentId, studentName }: { studentId: string; studentName: string }) {
  const { data: progressData, loading: progressLoading } = useAsync(
    () => api.getProgress(studentId) as Promise<ProgressRecord[]>,
    [studentId],
  );
  // كتب الطالب المعيَّنة (وإن لم توجد تعيينات — أو خادم قديم — نعرض كل الكتب)
  const { data: booksData, loading: booksLoading } = useAsync(async () => {
    try {
      const [all, assigned] = await Promise.all([api.getBooks(), api.getBookAssignments(studentId)]);
      const mine = new Set(assigned.map((a) => a.bookId));
      const list = all.filter((b) => mine.has(b.id));
      return list.length > 0 ? list : all;
    } catch {
      return [] as Book[];
    }
  }, [studentId]);
  const books = booksData || [];
  const [chosen, setChosen] = useState('');
  const bookId = chosen && books.some((b) => b.id === chosen) ? chosen : books[0]?.id;
  const { data: hadithsData, loading: hadithsLoading } = useAsync(
    () => (booksLoading ? Promise.resolve([] as Hadith[]) : (api.getHadiths(bookId) as Promise<Hadith[]>)),
    [booksLoading, bookId],
  );
  const loading = progressLoading || booksLoading || hadithsLoading;

  const progress = progressData || [];
  const hadiths = hadithsData || [];
  const stats = bookStats(hadiths, progress);
  const total = stats.total || APPS_CONFIG.HADITHS_COUNT;
  const { memorized, listened, read, completed, overall } = stats;

  if (loading) return <Card><div className="py-10 text-center text-on-surface-variant">جارٍ التحميل...</div></Card>;

  return (
    <Card>
      <CardHeader title={studentName} subtitle="تفاصيل الإنجاز" />
      {books.length > 1 && (
        <div className="mb-4 max-w-xs">
          <Select label="الكتاب" value={bookId || ''} onChange={(e) => setChosen(e.target.value)}>
            {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </Select>
        </div>
      )}
      {books.length === 1 && <p className="mb-4 text-sm text-on-surface-variant">الكتاب: {books[0].title}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="الأحاديث المكتملة" value={`${completed}/${total}`} color="success" />
        <Stat label="نسبة الإنجاز" value={`${Math.round(overall)}%`} color="primary" />
        <Stat label="الحفظ" value={`${memorized}`} color="info" />
        <Stat label="الاستماع" value={`${listened}`} color="warning" />
      </div>
      <div className="space-y-4">
        <ProgressRow icon={<BookMarked size={18} />} label="الحفظ (50%)" count={memorized} total={total} weight={50} />
        <ProgressRow icon={<Headphones size={18} />} label="الاستماع (25%)" count={listened} total={total} weight={25} />
        <ProgressRow icon={<FileText size={18} />} label="القراءة (25%)" count={read} total={total} weight={25} />
      </div>
      <div className="mt-5 pt-5 border-t border-outline-variant">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-on-surface">الإنجاز الإجمالي</span>
          <Badge variant={overall >= 100 ? 'success' : overall >= 50 ? 'warning' : 'error'}>{Math.round(overall)}%</Badge>
        </div>
        <ProgressBar value={overall} color={overall >= 100 ? 'success' : 'primary'} />
      </div>

      <AchievementApproval
        studentId={studentId}
        bookId={bookId}
        bookTitle={books.find((b) => b.id === bookId)?.title}
        overall={overall}
      />
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: 'success' | 'primary' | 'info' | 'warning' }) {
  const colors = { success: 'text-success-600', primary: 'text-primary-600', info: 'text-accent-600', warning: 'text-warning-600' };
  return (
    <div className="bg-surface-dim rounded-xl p-3 text-center">
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-on-surface-variant mt-1">{label}</p>
    </div>
  );
}

function ProgressRow({ icon, label, count, total, weight }: { icon: React.ReactNode; label: string; count: number; total: number; weight: number }) {
  const pct = total ? (count / total) * weight : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="flex items-center gap-2 font-medium text-on-surface">{icon} {label}</span>
        <span className="text-on-surface-variant">{count}/{total}</span>
      </div>
      <ProgressBar value={pct * (100 / weight)} />
    </div>
  );
}
