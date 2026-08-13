import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { ProgressRing, ProgressBar } from '@/components/ui/Progress';
import type { Hadith, ProgressRecord } from '@/types';
import { APPS_CONFIG } from '@/config';
import { BookMarked, Headphones, FileText } from 'lucide-react';

export function ProgressPage() {
  const { user } = useAuth();
  const { data: hadithsData } = useAsync(() => api.getHadiths() as Promise<Hadith[]>, []);
  const { data: progressData } = useAsync(
    () => api.getProgress(user!.id) as Promise<ProgressRecord[]>,
    [user?.id],
  );

  const hadiths = hadithsData || [];
  const progress = progressData || [];
  const total = hadiths.length || APPS_CONFIG.HADITHS_COUNT;

  const memorizedCount = progress.filter((p) => p.memorized).length;
  const listenedCount = progress.filter((p) => p.listened).length;
  const readCount = progress.filter((p) => p.read).length;

  const memorizedPct = total ? (memorizedCount / total) * 50 : 0;
  const listenedPct = total ? (listenedCount / total) * 25 : 0;
  const readPct = total ? (readCount / total) * 25 : 0;
  const overall = memorizedPct + listenedPct + readPct;

  const completedCount = progress.filter((p) => p.memorized && p.listened && p.read).length;
  const remainingCount = total - completedCount;

  return (
    <div className="animate-fade-in">
      <PageHeader title="إنجازي" subtitle="متابعة تقدّمك في برنامج زاد الحلقات" />

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
