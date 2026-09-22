import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { ProgressRing, ProgressBar } from '@/components/ui/Progress';
import { BookTabs } from '@/components/books/BookTabs';
import { useStudentBooks } from '@/hooks/useStudentBooks';
import { bookStats } from '@/lib/books';
import type { Hadith, ProgressRecord } from '@/types';
import { APPS_CONFIG } from '@/config';
import { BookMarked, Headphones, FileText } from 'lucide-react';

export function ProgressPage() {
  const { user } = useAuth();
  const { books, book, bookId, setBookId, ready } = useStudentBooks();
  const { data: hadithsData } = useAsync(
    () => (ready ? (api.getHadiths(bookId) as Promise<Hadith[]>) : Promise.resolve([] as Hadith[])),
    [ready, bookId],
  );
  const { data: progressData } = useAsync(
    () => api.getProgress(user!.id) as Promise<ProgressRecord[]>,
    [user?.id],
  );

  const hadiths = hadithsData || [];
  const progress = progressData || [];
  // الإحصاءات لعناصر الكتاب المختار فقط
  const stats = bookStats(hadiths, progress);
  const total = stats.total || APPS_CONFIG.HADITHS_COUNT;

  const memorizedCount = stats.memorized;
  const listenedCount = stats.listened;
  const readCount = stats.read;

  const memorizedPct = stats.total ? (memorizedCount / total) * 50 : 0;
  const listenedPct = stats.total ? (listenedCount / total) * 25 : 0;
  const readPct = stats.total ? (readCount / total) * 25 : 0;
  const overall = stats.overall;

  const completedCount = stats.completed;
  const remainingCount = Math.max(0, total - completedCount);

  return (
    <div className="animate-fade-in">
      <PageHeader title="إنجازي" subtitle={book ? `متابعة تقدّمك في «${book.title}»` : 'متابعة تقدّمك في برنامج زاد الحلقات'} />

      <BookTabs books={books} value={bookId} onChange={setBookId} />

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="flex flex-col items-center">
          <CardHeader title="الإنجاز الإجمالي" />
          <div className="flex-1 flex items-center justify-center py-4">
            <ProgressRing value={overall} size={160} stroke={14} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="تفصيل المهارات" subtitle="الحفظ 50% · الاستماع 25% · القراءة 25%" />
          <div className="space-y-5">
            <ProgressRow icon={<BookMarked size={20} />} label="الحفظ" count={memorizedCount} total={total} pct={memorizedPct * 2} color="primary" />
            <ProgressRow icon={<Headphones size={20} />} label="الاستماع" count={listenedCount} total={total} pct={listenedPct * 4} color="info" />
            <ProgressRow icon={<FileText size={20} />} label="القراءة" count={readCount} total={total} pct={readPct * 4} color="success" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="text-center"><p className="text-3xl font-bold text-primary-600">{completedCount}</p><p className="text-sm text-on-surface-variant mt-1">أحاديث مكتملة</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-bold text-warning-600">{remainingCount}</p><p className="text-sm text-on-surface-variant mt-1">أحاديث متبقية</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-bold text-success-600">{Math.round(overall)}%</p><p className="text-sm text-on-surface-variant mt-1">نسبة الإنجاز</p></div></Card>
        <Card><div className="text-center"><p className="text-3xl font-bold text-accent-600">{total}</p><p className="text-sm text-on-surface-variant mt-1">إجمالي الأحاديث</p></div></Card>
      </div>
    </div>
  );
}

function ProgressRow({ icon, label, count, total, pct, color }: {
  icon: React.ReactNode; label: string; count: number; total: number; pct: number; color: 'primary' | 'info' | 'success';
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="flex items-center gap-2 font-medium text-on-surface">{icon} {label}</span>
        <span className="text-on-surface-variant">{count}/{total}</span>
      </div>
      <ProgressBar value={pct} color={color} />
    </div>
  );
}
