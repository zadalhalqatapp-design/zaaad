import { useEffect, useState } from 'react';
import { getMyEnrollments, listNotifications } from '@/api';
import { useAuth } from '@/lib/auth';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/Feedback';
import { BookOpen, Award, Flame, Target, Calendar, TrendingUp } from 'lucide-react';
import type { Enrollment, Program, Notification } from '@/lib/types';

interface StudentDashboard {
  enrollments: (Enrollment & { program: Pick<Program, 'id' | 'name' | 'description'> })[];
  notifications: Notification[];
}

export function StudentDashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const [enrollments, notifications] = await Promise.all([
        getMyEnrollments(),
        listNotifications(),
      ]);
      setData({
        enrollments: enrollments as StudentDashboard['enrollments'],
        notifications: notifications.slice(0, 5),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل لوحة الطالب.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="جارٍ تحميل لوحتك…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const activeEnrollment = data?.enrollments.find((e) => e.status === 'active' || e.status === 'ready_for_test');
  const totalPoints = data?.enrollments.reduce((sum, e) => sum + e.points, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100">مرحبًا، {profile?.full_name}</h1>
        <p className="text-sm text-primary-500 dark:text-primary-400">إليك ملخص تقدمك في برامج الحلقات.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Target} label="البرنامج الحالي" value={activeEnrollment?.program.name ?? 'لا يوجد'} />
        <StatCard icon={TrendingUp} label="نسبة الإنجاز" value={activeEnrollment ? `${activeEnrollment.progress}%` : '0%'} />
        <StatCard icon={Award} label="النقاط" value={String(totalPoints)} />
        <StatCard icon={Flame} label="الإشعارات" value={String(data?.notifications.filter((n) => !n.read_at).length ?? 0)} />
      </div>

      <section>
        <h2 className="section-title mb-3">برامجي</h2>
        {data && data.enrollments.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.enrollments.map((e) => (
              <div key={e.id} className="card p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-primary-800 dark:text-primary-100">{e.program.name}</h3>
                    {e.program.description && <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5 line-clamp-2">{e.program.description}</p>}
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-primary-500 dark:text-primary-400 mb-1">
                    <span>التقدم</span>
                    <span>{e.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary-100 dark:bg-primary-800/60 overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${e.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-6">
            <EmptyState icon={BookOpen} title="لا توجد برامج مشترك بها" description="بعد اعتماد حسابك من الإدارة، سيتم تسجيلك في البرنامج المناسب." />
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title mb-3">آخر الإشعارات</h2>
        <div className="card divide-y divide-primary-100/60 dark:divide-primary-800/60">
          {data && data.notifications.length > 0 ? (
            data.notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-4">
                <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.read_at ? 'bg-primary-200 dark:bg-primary-700' : 'bg-gold-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-800 dark:text-primary-100">{n.title}</p>
                  <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">{n.body}</p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState icon={Calendar} title="لا توجد إشعارات" />
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-primary-400 dark:text-primary-500 mb-1.5">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-bold text-primary-800 dark:text-primary-100 truncate">{value}</p>
    </div>
  );
}
