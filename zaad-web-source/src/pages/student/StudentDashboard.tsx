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
import { BookOpen, Award, CalendarDays, CheckCircle, Play, FileText } from 'lucide-react';

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

  if (loadingHadiths) {
    return <div className="py-20 text-center text-on-surface-variant">جارٍ تحميل البيانات...</div>;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title={`مرحبًا، ${user?.name}`} subtitle={book ? `لوحة الطالب — ${book.title}` : 'لوحة الطالب — برنامج زاد الحلقات'} />

      <BookTabs books={books} value={bookId} onChange={setBookId} />

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
        <StatCard icon={<BookOpen size={24} />} label="العناصر المنجزة" value={`${completedCount}/${totalHadiths}`} color="success" />
        <StatCard icon={<CalendarDays size={24} />} label="الأيام المتبقية" value={remainingDays} color="warning" />
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
                    <div className="flex gap-2">
                      <a href={h.youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-600 hover:underline">
                        <Play size={14} /> يوتيوب
                      </a>
                      <a href={h.audioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-600 hover:underline">
                        <Play size={14} /> صوت
                      </a>
                      <a href={h.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-600 hover:underline">
                        <FileText size={14} /> صورة الحديث
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<CalendarDays size={40} />} title="لا يوجد مقرر لهذا اليوم" />
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader title="آخر الأحاديث" subtitle="تابع تقدّمك في كل حديث" />
          {hadiths.length === 0 ? (
            <EmptyState icon={<BookOpen size={40} />} title="لا توجد أحاديث متاحة" />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {hadiths.slice(0, 6).map((h) => {
                const p = getProgress(h.id);
                const done = p?.memorized && (p?.listened || p?.watched);
                return (
                  <div key={h.id} className={`border rounded-xl p-3 ${done ? 'border-success-200 bg-success-50/50' : 'border-outline-variant'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary-600">#{h.number}</span>
                      {done && <CheckCircle size={14} className="text-success-600" />}
                    </div>
                    <p className="font-arabic text-sm text-on-surface line-clamp-2 leading-relaxed">{h.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
