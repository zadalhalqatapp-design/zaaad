import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { MediaViewer } from '@/components/media/MediaViewer';
import { BookTabs } from '@/components/books/BookTabs';
import { useStudentBooks } from '@/hooks/useStudentBooks';
import { groupByDay } from '@/lib/books';
import type { Hadith, ProgressRecord, AppSettings, DailyLesson } from '@/types';
import { APPS_CONFIG } from '@/config';
import { CalendarDays, PlayCircle, CheckCircle, BookMarked, ArrowDown } from 'lucide-react';

export function DailyLessonsPage() {
  const { user } = useAuth();
  const { books, book, bookId, setBookId, ready } = useStudentBooks();
  const { data: hadithsData } = useAsync(
    () => (ready ? (api.getHadiths(bookId) as Promise<Hadith[]>) : Promise.resolve([] as Hadith[])),
    [ready, bookId],
  );
  const { data: progressData, reload: reloadProgress } = useAsync(
    () => api.getProgress(user!.id) as Promise<ProgressRecord[]>,
    [user?.id],
  );
  const { data: lessonsData } = useAsync<DailyLesson | null>(
    () => (ready ? api.getDailyLessons(bookId) : Promise.resolve(null)),
    [ready, bookId],
  );
  const { data: settingsData } = useAsync(() => api.getSettings() as Promise<AppSettings>, []);

  const hadiths = hadithsData || [];
  const progress = progressData || [];
  const currentDay = lessonsData?.day || 1;
  const daysCount = book?.daysCount ?? lessonsData?.daysCount ?? APPS_CONFIG.PROGRAM_DAYS;
  const perDay = book?.itemsPerDay ?? lessonsData?.itemsPerDay ?? APPS_CONFIG.HADITHS_PER_DAY;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const currentRef = useRef<HTMLDivElement | null>(null);
  const scrolledRef = useRef(false);

  const getProgress = (hid: string) => progress.find((p) => p.hadithId === hid);
  const selected = selectedId ? hadiths.find((h) => h.id === selectedId) || null : null;

  // أيام الكتاب كلها: عدد الأيام وعناصر اليوم يحددهما المدير لكل كتاب
  const allDays = groupByDay(hadiths, perDay, daysCount);

  // عند فتح الصفحة ننزل مباشرة إلى اليوم الحالي (القائمة قد تضم 20+ يومًا)
  useEffect(() => {
    if (scrolledRef.current || !lessonsData || hadiths.length === 0) return;
    scrolledRef.current = true;
    const t = setTimeout(() => currentRef.current?.scrollIntoView({ block: 'center' }), 150);
    return () => clearTimeout(t);
  }, [lessonsData, hadiths.length]);

  const toggleMemorized = async () => {
    if (!selected) return;
    const now = !getProgress(selected.id)?.memorized;
    setSaving(true);
    try {
      await api.saveProgress(selected.id, 'memorized', now);
      await reloadProgress();
      notify(now ? 'سُجّل الحفظ — بارك الله فيك' : 'أُلغي تسجيل الحفظ', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذّر تحديث الحفظ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="المقرر اليومي"
        subtitle={`${book ? `${book.title} — ` : ''}اليوم ${currentDay} من ${daysCount} — ${perDay} يوميًا`}
      />

      <BookTabs books={books} value={bookId} onChange={setBookId} />

      {lessonsData && (
        <Card className="mb-6 bg-primary-50 border-primary-200">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-primary-600" size={28} />
            <div>
              <p className="font-semibold text-primary-800">مقرر اليوم {currentDay}</p>
              <p className="text-sm text-primary-600">{lessonsData.date}</p>
            </div>
            <Button size="sm" variant="outlined" className="ms-auto" icon={<ArrowDown size={16} />} onClick={() => currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              اذهب لليوم
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {allDays.map(({ day, hadiths: dayHadiths }) => {
          const isCurrent = day === currentDay;
          const isPast = day < currentDay;
          const isFuture = day > currentDay;
          const allDone = dayHadiths.length > 0 && dayHadiths.every((h) => {
            const p = getProgress(h.id);
            return p?.memorized && (p?.watched || p?.listened);
          });

          return (
            <div key={day} ref={isCurrent ? currentRef : undefined} className="scroll-mt-24">
            <Card className={isCurrent ? 'border-primary-400 ring-1 ring-primary-300' : ''}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    isCurrent ? 'bg-primary-600 text-white' : isPast ? 'bg-success-100 text-success-700' : 'bg-surface-dim text-on-surface-variant'
                  }`}>
                    {day}
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">اليوم {day}</p>
                    {isPast && allDone && <p className="text-xs text-success-600">مكتمل</p>}
                    {isCurrent && <p className="text-xs text-primary-600">اليوم الحالي</p>}
                    {isFuture && <p className="text-xs text-on-surface-variant">قادم</p>}
                  </div>
                </div>
                {allDone && <CheckCircle className="text-success-600" size={24} />}
              </div>

              {dayHadiths.length === 0 ? (
                <p className="text-sm text-on-surface-variant py-2">لا توجد أحاديث مضافة لهذا اليوم.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {dayHadiths.map((h) => {
                    const p = getProgress(h.id);
                    const tasks = [p?.memorized, p?.watched, p?.listened, p?.read].filter(Boolean).length;
                    return (
                      <button
                        key={h.id}
                        onClick={() => setSelectedId(h.id)}
                        className="text-start border border-outline-variant rounded-xl p-3 hover:border-primary-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-primary-600">حديث #{h.number}</span>
                          <span className="text-xs text-on-surface-variant">{tasks}/4</span>
                        </div>
                        <p className="font-arabic text-sm text-on-surface line-clamp-2 mb-2 leading-relaxed">{h.text}</p>
                        <span className="inline-flex items-center gap-1.5 text-xs text-primary-600 font-medium">
                          <PlayCircle size={14} /> فتح المادة (فيديو / صوت / صورة الحديث)
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
            </div>
          );
        })}
      </div>

      {hadiths.length === 0 && (
        <Card><EmptyState icon={<CalendarDays size={40} />} title="لا توجد أحاديث" description="لم تتم إضافة أحاديث البرنامج بعد." /></Card>
      )}

      <Dialog
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? `الحديث رقم ${selected.number}` : ''}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-secondary-200 bg-gradient-to-b from-secondary-50/70 to-primary-50/60 px-5 py-5 text-center">
              <p className="reading-text font-arabic text-[1.5rem] font-bold text-primary-900">{selected.text}</p>
              {selected.narrator && <p className="mt-2 text-xs text-primary-800">الراوي: {selected.narrator}</p>}
            </div>
            {selected.explanation && (
              <details className="rounded-xl border border-outline-variant px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-on-surface">الشرح</summary>
                <p className="reading-text font-naskh mt-2 text-[1.05rem] text-on-surface/90">{selected.explanation}</p>
              </details>
            )}
            {(selected.youtubeUrl || selected.audioUrl || selected.pdfUrl) ? (
              <MediaViewer
                hadith={selected}
                progress={getProgress(selected.id)}
                settings={settingsData}
                onProgressSaved={reloadProgress}
              />
            ) : (
              <p className="rounded-xl bg-surface-dim px-4 py-3 text-sm text-on-surface-variant">لا توجد مادة صوتية أو مرئية لهذا الحديث بعد.</p>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
              <p className="text-xs text-on-surface-variant">حالة الحفظ: {getProgress(selected.id)?.memorized ? 'تم الحفظ' : 'لم يُسجَّل بعد'}</p>
              <Button
                variant={getProgress(selected.id)?.memorized ? 'outlined' : 'filled'}
                icon={<BookMarked size={18} />}
                loading={saving}
                onClick={toggleMemorized}
              >
                {getProgress(selected.id)?.memorized ? 'إلغاء تسجيل الحفظ' : 'تم الحفظ'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
