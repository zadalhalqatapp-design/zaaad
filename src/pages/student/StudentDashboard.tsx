import { Link } from 'react-router-dom';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard, EmptyState } from '@/components/ui/Badge';
import { ProgressRing, ProgressBar } from '@/components/ui/Progress';
import { BookTabs } from '@/components/books/BookTabs';
import { useStudentBooks } from '@/hooks/useStudentBooks';
import { bookStats } from '@/lib/books';
import type { Hadith, ProgressRecord, DailyLesson } from '@/types';
import { APPS_CONFIG } from '@/config';
import { BookOpen, Award, CalendarDays, CheckCircle, ArrowLeft, PlayCircle } from 'lucide-react';

export function StudentDashboard() {
  const { user } = useAuth();
  const { books, book, bookId, setBookId, ready } = useStudentBooks();
  const { data: hadithsData, loading: hadithsLoading } = useAsync(
    () => (ready ? api.getHadiths(bookId) : Promise.resolve([] as Hadith[])) as Promise<Hadith[]>,
    [ready, bookId],
  );
  const { data: progressData } = useAsync(
    () => api.getProgress(user!.id),
    [user?.id],
  );
  const { data: lessonsData } = useAsync<DailyLesson | null>(
    () => (ready ? api.getDailyLessons(bookId) : Promise.resolve(null)),
    [ready, bookId],
  );
  const loadingHadiths = !ready || hadithsLoading;

  const hadiths = (hadithsData || []) as Hadith[];
  const progress = (progressData || []) as ProgressRecord[];
  const lessons = lessonsData;

  const getProgress = (hid: string) => progress.find((p) => p.hadithId === hid);
  const stats = bookStats(hadiths, progress);
  const completedCount = stats.completed;
  const totalHadiths = stats.total || APPS_CONFIG.HADITHS_COUNT;

  const memorizedCount = stats.memorized;
  const mediaCount = stats.mediaDone;

  const memorizedPct = stats.total ? (memorizedCount / totalHadiths) * 50 : 0;
  const mediaPct = stats.total ? (mediaCount / totalHadiths) * 50 : 0;
  const overallPct = stats.overall;

  const daysCount = book?.daysCount ?? lessons?.daysCount ?? APPS_CONFIG.PROGRAM_DAYS;
  const currentDay = lessons?.day || 1;
  const remainingDays = Math.max(0, daysCount - currentDay);

  // أول عنصر لم يكتمل: من مقرر اليوم أولًا، وإلا من بقية الكتاب — لتعرف ما عليك فعله الآن بنقرة واحدة
  const isDone = (h: Hadith) => {
    const p = getProgress(h.id);
    return !!(p?.memorized && (p?.listened || p?.watched));
  };
  const todayList = lessons?.hadiths ?? [];
  const todayPending = todayList.find((h) => !isDone(h));
  const anyPending = todayPending ?? hadiths.find((h) => !isDone(h));
  const nextTodo = anyPending
    ? {
        hadith: anyPending,
        isToday: !!todayPending,
        missing: (() => {
          const p = getProgress(anyPending.id);
          const parts: string[] = [];
          if (!p?.memorized) parts.push('الحفظ');
          if (!(p?.listened || p?.watched)) parts.push('السماع');
          return `المتبقي: ${parts.join(' و')}`;
        })(),
      }
    : null;

  if (loadingHadiths) {
    return <PageSkeleton rows={4} />;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title={`مرحبًا، ${user?.name}`} subtitle={book ? `لوحة الطالب — ${book.title}` : 'لوحة الطالب — برنامج زاد الحلقات'} />

      <BookTabs books={books} value={bookId} onChange={setBookId} />

      {nextTodo && (
        <Link
          to="/student/daily"
          className="mb-6 flex items-center gap-4 rounded-2xl bg-gradient-to-l from-primary-600 to-primary-700 p-5 text-white shadow-md transition-transform hover:-translate-y-0.5"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15"><PlayCircle size={28} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-primary-100">{nextTodo.isToday ? `مقرر اليوم ${currentDay}` : 'تابع من حيث توقفت'}</span>
            <span className="block truncate text-lg font-bold">حديث #{nextTodo.hadith.number} — {nextTodo.hadith.text}</span>
            <span className="block text-xs text-primary-100">{nextTodo.missing}</span>
          </span>
          <ArrowLeft size={22} className="shrink-0" />
        </Link>
      )}

      {ready && books.length === 0 && !book && (
        <Card className="mb-6 bg-warning-50 border-warning-200">
          <p className="text-sm text-warning-700">لم يُعيَّن لك كتاب بعد. سيعيّن لك المشرف الكتب المطلوبة.</p>
        </Card>
      )}

      {stats.total > 0 && stats.completed >= stats.total && (
        <Card className="mb-6 bg-success-50 border-success-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-success-600" size={28} />
            <div>
              <p className="font-semibold text-success-700">أتممت هذا الكتاب</p>
              <p className="text-sm text-success-600">أكملت «{book?.title || 'البرنامج'}». سيتم إصدار شهادتك قريبًا.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<BookOpen size={24} />} label="مكتملة" value={`${completedCount}/${totalHadiths}`} color="success" />
        <StatCard icon={<CalendarDays size={24} />} label="أيام متبقية" value={remainingDays} color="warning" />
        <StatCard icon={<Award size={24} />} label="نسبة الإنجاز" value={`${Math.round(overallPct)}%`} color="primary" />
        <StatCard icon={<CheckCircle size={24} />} label="اليوم الحالي" value={Math.min(currentDay, daysCount)} color="info" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 flex flex-col items-center">
          <CardHeader title="نسبة الإنجاز الإجمالية" subtitle="الحفظ 50% · السماع (صوت أو فيديو) 50%" />
          <div className="flex-1 flex items-center justify-center py-4">
            <ProgressRing value={overallPct} size={160} stroke={14} label="الإنجاز" />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="تفصيل الإنجاز" subtitle="تقدّمك في كل مهارة" />
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-on-surface">الحفظ</span>
                <span className="text-on-surface-variant">{memorizedCount}/{totalHadiths}</span>
              </div>
              <ProgressBar value={memorizedPct * 2} color="primary" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-on-surface">السماع (صوت أو فيديو)</span>
                <span className="text-on-surface-variant">{mediaCount}/{totalHadiths}</span>
              </div>
              <ProgressBar value={mediaPct * 2} color="info" />
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="مقرر اليوم"
            subtitle={lessons ? `اليوم ${lessons.day} — ${lessons.date}` : 'لا يوجد مقرر متاح'}
          />
          {lessons && lessons.hadiths.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {lessons.hadiths.map((h) => {
                const p = getProgress(h.id);
                return (
                  <div key={h.id} className="border border-outline-variant rounded-xl p-4 hover:border-primary-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">حديث #{h.number}</span>
                      {p?.memorized && (p?.listened || p?.watched) && <CheckCircle size={18} className="text-success-600" />}
                    </div>
                    <p className="font-arabic text-base text-on-surface mb-3 line-clamp-3 leading-relaxed">{h.text}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex gap-1.5 text-[11px]">
                        <span className={`rounded-full px-2 py-0.5 ${p?.memorized ? 'bg-success-50 text-success-700' : 'bg-surface-dim text-on-surface-variant'}`}>الحفظ</span>
                        <span className={`rounded-full px-2 py-0.5 ${p?.listened || p?.watched ? 'bg-success-50 text-success-700' : 'bg-surface-dim text-on-surface-variant'}`}>السماع</span>
                      </span>
                      <Link to="/student/daily" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline">
                        افتح المادة <ArrowLeft size={14} />
                      </Link>                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<CalendarDays size={40} />} title="لا يوجد مقرر لليوم الحالي بعد" />
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="آخر الأحاديث"
            subtitle="تابع تقدّمك في كل حديث"
            action={<Link to="/student/hadiths" className="text-sm font-semibold text-primary-700 hover:underline">عرض الكل</Link>}
          />
          {hadiths.length === 0 ? (
            <EmptyState icon={<BookOpen size={40} />} title="لا توجد أحاديث متاحة" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {hadiths.slice(0, 6).map((h) => {
                const p = getProgress(h.id);
                const done = p?.memorized && (p?.listened || p?.watched);
                return (
                  <Link key={h.id} to="/student/hadiths" className={`block border rounded-xl p-3 transition-colors hover:border-primary-300 ${done ? 'border-success-200 bg-success-50/50' : 'border-outline-variant'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary-600">#{h.number}</span>
                      {done && <CheckCircle size={14} className="text-success-600" />}
                    </div>
                    <p className="font-arabic text-sm text-on-surface line-clamp-2 leading-relaxed">{h.text}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
