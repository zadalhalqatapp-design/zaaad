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
import type { Hadith, ProgressRecord, AppSettings } from '@/types';
import { BookOpen, BookMarked, Headphones, FileText, Check, ChevronLeft, Play } from 'lucide-react';

export function HadithsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { data: hadithsData, loading } = useAsync(() => api.getHadiths() as Promise<Hadith[]>, []);
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
      <PageHeader title="الأحاديث" subtitle="جميع أحاديث برنامج زاد الحلقات — 40 حديثًا" />

      {hadiths.length === 0 ? (
        <Card><EmptyState icon={<BookOpen size={40} />} title="لا توجد أحاديث متاحة بعد" description="سيتم إضافة الأحاديث قريبًا." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hadiths.map((h) => {
            const p = getProgress(h.id);
            const done = p?.memorized && p?.watched && p?.listened && p?.read;
            const tasks = [p?.memorized, p?.watched, p?.listened, p?.read].filter(Boolean).length;
            return (
              <Card
                key={h.id}
                className="cursor-pointer hover:border-primary-300 hover:shadow-md transition-all"
                onClick={() => setSelectedId(h.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50 text-primary-700 text-sm font-bold">
                    {h.number}
                  </span>
                  {done ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success-600 font-medium">
                      <Check size={14} /> مكتمل
                    </span>
                  ) : (
                    <span className="text-xs text-on-surface-variant">{tasks}/4</span>
                  )}
                </div>
                <p className="font-arabic text-base text-on-surface leading-relaxed line-clamp-3 mb-3">{h.text}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant bg-surface-dim px-2 py-0.5 rounded-full">{h.category}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-primary-600 font-medium">
                    عرض <ChevronLeft size={14} />
                  </span>
                </div>
              </Card>
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
          <div className="space-y-5">
            <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
              <p className="font-arabic text-lg text-on-surface leading-loose">{selected.text}</p>
              {selected.narrator && <p className="text-xs text-on-surface-variant mt-2">الراوي: {selected.narrator}</p>}
            </div>

            <div>
              <h4 className="font-semibold text-on-surface mb-2">الشرح</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">{selected.explanation}</p>
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
                <StatusChip icon={FileText} label="PDF" active={!!selectedProgress?.read} percent={selectedProgress?.pdfPercent} available={!!selected.pdfUrl} />
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
                يُعلَّم الفيديو والصوت وPDF تلقائيًا كمكتمل بمجرد بلوغ نسبة المشاهدة/الاستماع/القراءة المطلوبة. "تم الحفظ" يُسجَّل يدويًا من قبلك.
              </p>
            </div>
          </div>
        )}
      </Dialog>
    </div>
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
      {active ? <Check size={15} /> : <span className="text-[10px]">{Math.round(percent || 0)}%</span>}
    </div>
  );
}
