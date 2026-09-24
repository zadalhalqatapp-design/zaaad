import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { MediaViewer } from '@/components/media/MediaViewer';
import { BookTabs } from '@/components/books/BookTabs';
import { useStudentBooks } from '@/hooks/useStudentBooks';
import type { Hadith, ProgressRecord, AppSettings } from '@/types';
import { BookOpen, BookMarked, Headphones, FileText, Check, ChevronLeft, Play } from 'lucide-react';

export function HadithsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { books, book, bookId, setBookId, ready } = useStudentBooks();
  const { data: hadithsData, loading: hadithsLoading } = useAsync(
    () => (ready ? (api.getHadiths(bookId) as Promise<Hadith[]>) : Promise.resolve([] as Hadith[])),
    [ready, bookId],
  );
  const loading = !ready || hadithsLoading;
  const { data: progressData, reload: reloadProgress } = useAsync(
    () => api.getProgress(user!.id) as Promise<ProgressRecord[]>,
    [user?.id],
  );
  const { data: settingsData } = useAsync(() => api.getSettings() as Promise<AppSettings>, []);

  const hadiths = hadithsData || [];
  const progress = progressData || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [togglingMemorized, setTogglingMemorized] = useState(false);

  const getProgress = (hid: string) => progress.find((p) => p.hadithId === hid);
  const selected = selectedId ? hadiths.find((h) => h.id === selectedId) || null : null;
  const selectedProgress = selected ? getProgress(selected.id) : undefined;

  const toggleMemorized = async () => {
    if (!selected) return;
    setTogglingMemorized(true);
    try {
      await api.saveProgress(selected.id, 'memorized', !selectedProgress?.memorized);
      await reloadProgress();
      notify('تم تحديث التقدّم', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل التحديث.', 'error');
    } finally {
      setTogglingMemorized(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={book ? book.title : 'الأحاديث'}
        subtitle={book ? `${hadiths.length} عنصرًا — ${book.daysCount} يومًا` : 'جميع أحاديث برنامج زاد الحلقات'}
      />

      <BookTabs books={books} value={bookId} onChange={setBookId} />

      {hadiths.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen size={40} />}
            title={ready && books.length === 0 && !book ? 'لم يُعيَّن لك كتاب بعد' : 'لا يوجد محتوى متاح بعد'}
            description={ready && books.length === 0 && !book ? 'سيعيّن لك المشرف الكتب المطلوبة.' : 'سيتم إضافة المحتوى قريبًا.'}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {hadiths.map((h) => {
            const p = getProgress(h.id);
            const done = p?.memorized && (p?.watched || p?.listened);
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedId(h.id)}
                className={`group relative overflow-hidden rounded-2xl border bg-surface p-5 text-start shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  done ? 'border-success-400/60' : 'border-outline-variant hover:border-primary-300'
                }`}
              >
                <span className={`absolute inset-y-0 start-0 w-1.5 ${done ? 'bg-success-500' : 'bg-primary-500/70'}`} />
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-primary-700 px-2 text-sm font-bold text-white shadow-sm ring-4 ring-primary-50">
                    {h.number}
                  </span>
                  {done ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700">
                      <Check size={14} /> مكتمل
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                      <Dot on={!!p?.memorized} label="الحفظ" />
                      <Dot on={!!(p?.watched || p?.listened)} label="السماع" />
                    </span>
                  )}
                </div>
                <p className="mb-4 line-clamp-4 font-arabic text-[1.35rem] leading-[2.1] text-on-surface">{h.text}</p>
                <div className="flex items-center justify-between border-t border-outline-variant/70 pt-3">
                  {h.category ? (
                    <span className="rounded-full bg-secondary-50 px-2.5 py-0.5 text-xs font-medium text-secondary-800">{h.category}</span>
                  ) : <span />}
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 transition-transform group-hover:-translate-x-0.5">
                    عرض الحديث <ChevronLeft size={14} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? `الحديث رقم ${selected.number}` : ''}
        size="lg"
      >
        {selected && (
          <div className="space-y-6">
            <div className="relative rounded-2xl border border-secondary-200 bg-gradient-to-b from-secondary-50/70 to-primary-50/60 px-5 py-6 text-center">
              <span aria-hidden className="absolute -top-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-primary-700 px-3 py-0.5 text-lg leading-none text-secondary-300">❝</span>
              <p className="font-arabic text-[1.65rem] font-bold leading-[2.3] text-primary-900">{selected.text}</p>
              {selected.narrator && (
                <p className="mt-3 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-primary-800 ring-1 ring-primary-100">
                  الراوي: {selected.narrator}
                </p>
              )}
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-2 font-bold text-on-surface">
                <span className="h-5 w-1.5 rounded-full bg-secondary-400" /> الشرح
              </h4>
              <p className="font-naskh text-[1.05rem] leading-[2.15] text-on-surface/90">{selected.explanation}</p>
            </div>

            {(selected.youtubeUrl || selected.audioUrl || selected.pdfUrl) && (
              <MediaViewer
                hadith={selected}
                progress={selectedProgress}
                settings={settingsData}
                onProgressSaved={reloadProgress}
              />
            )}

            <div className="border-t border-outline-variant pt-4">
              <h4 className="font-semibold text-on-surface mb-3">حالة إنجازك</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatusChip icon={Play} label="الفيديو" active={!!selectedProgress?.watched} percent={selectedProgress?.videoPercent} available={!!selected.youtubeUrl} />
                <StatusChip icon={Headphones} label="الصوت" active={!!selectedProgress?.listened} percent={selectedProgress?.audioPercent} available={!!selected.audioUrl} />
                <StatusChip icon={FileText} label="صورة الحديث" active={!!selectedProgress?.read} available={!!selected.pdfUrl} />
                <button
                  onClick={toggleMemorized}
                  disabled={togglingMemorized}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selectedProgress?.memorized
                      ? 'border-success-400 bg-success-50 text-success-700'
                      : 'border-outline-variant text-on-surface-variant hover:border-primary-300'
                  }`}
                >
                  <BookMarked size={22} />
                  <span className="text-xs font-medium">تم الحفظ</span>
                  {selectedProgress?.memorized && <Check size={15} />}
                </button>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2">
                يُعلَّم السماع مكتملًا تلقائيًا بإكمال الفيديو أو الصوت — أيهما أولًا. صورة الحديث للاطلاع فقط. "تم الحفظ" يُسجَّل يدويًا من قبلك.
              </p>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function Dot({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${on ? 'bg-success-50 text-success-700' : 'bg-surface-dim text-on-surface-variant'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-success-500' : 'bg-outline'}`} />
      {label}
    </span>
  );
}

function StatusChip({
  icon: Icon,
  label,
  active,
  percent,
  available,
}: {
  icon: typeof Play;
  label: string;
  active: boolean;
  percent?: number;
  available: boolean;
}) {
  if (!available) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-outline-variant text-on-surface-variant/50">
        <Icon size={22} />
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[10px]">غير متاح</span>
      </div>
    );
  }
  return (
    <div
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
        active ? 'border-success-400 bg-success-50 text-success-700' : 'border-outline-variant text-on-surface-variant'
      }`}
    >
      <Icon size={22} />
      <span className="text-xs font-medium">{label}</span>
      {active ? <Check size={15} /> : percent !== undefined ? (
        <span className="text-[10px]">{Math.round(percent)}%</span>
      ) : (
        <span className="text-[10px]">لم يُطَّلَع بعد</span>
      )}
    </div>
  );
}
