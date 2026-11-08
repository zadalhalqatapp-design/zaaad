import { Link } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard, EmptyState, Badge } from '@/components/ui/Badge';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { fmtAgo } from '@/lib/format';
import type { DashboardData } from '@/types';
import { Users, UserCheck, Award, Clock, History, GraduationCap, TrendingUp, ScanLine, UserPlus, ArrowLeft, type LucideIcon } from 'lucide-react';

export function ManagementDashboard() {
  const { user } = useAuth();
  const { data, loading } = useAsync(() => api.getDashboard() as unknown as Promise<DashboardData>, []);

  if (loading) return <PageSkeleton rows={4} />;

  const base = `/${user?.role ?? 'admin'}`;
  const isAdmin = user?.role === 'admin';
  const stats = data?.stats;
  const ops = data?.recentOperations || [];
  const registrations = data?.recentRegistrations || [];
  const pending = stats?.pendingStudents ?? 0;

  // إجراءات سريعة: أكثر ما يفعله المدير/المشرف يوميًا، بنقرة واحدة وبأرقام تدلّ على المطلوب
  const actions: { to: string; label: string; hint: string; icon: LucideIcon; badge?: number; show: boolean }[] = [
    { to: `${base}/approvals`, label: 'طلبات التسجيل', hint: pending > 0 ? `${pending} بانتظار المراجعة` : 'لا طلبات معلّقة', icon: UserPlus, badge: pending, show: true },
    { to: `${base}/student-progress`, label: 'إنجاز الطلاب', hint: 'اعتماد التقديرات', icon: TrendingUp, show: true },
    { to: `${base}/students`, label: 'متابعة الطلاب', hint: `${stats?.totalStudents ?? 0} طالب`, icon: Users, show: true },
    { to: `${base}/issue-certificates`, label: 'إصدار الشهادات', hint: `${stats?.certificatesCount ?? 0} صادرة`, icon: Award, show: isAdmin },
    { to: `${base}/cycles`, label: 'إدارة البرنامج', hint: stats?.activeCycle?.name ?? 'بلا دورة نشطة', icon: GraduationCap, show: isAdmin },
    { to: `${base}/verify`, label: 'التحقق من شهادة', hint: 'امسح رمز QR', icon: ScanLine, show: true },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title={`مرحبًا، ${user?.name}`} subtitle="لوحة التحكم الإدارية" />

      {user?.role === 'supervisor' && (!user.cycleIds || user.cycleIds.length === 0) && (
        <div className="mb-6 rounded-xl border border-warning-400 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          لم تُخصَّص لك أي دورة بعد، لذلك لا تظهر لك بيانات طلاب. تواصل مع المدير ليخصّص لك الدورات التي تتابع طلابها،
          ثم أعد تحميل الصفحة.
        </div>
      )}

      {pending > 0 && (
        <Link
          to={`${base}/approvals`}
          className="mb-6 flex items-center gap-3 rounded-2xl border border-warning-400 bg-warning-50 p-4 text-warning-700 transition-colors hover:bg-warning-50/70"
        >
          <Clock size={22} className="shrink-0" />
          <span className="flex-1 text-sm font-semibold">لديك {pending} طلب تسجيل بانتظار المراجعة</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold">راجعها الآن <ArrowLeft size={16} /></span>
        </Link>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {actions.filter((a) => a.show).map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.to}
              to={a.to}
              className="group relative flex flex-col items-center gap-2 rounded-2xl border border-outline-variant bg-surface p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 group-hover:bg-primary-100"><Icon size={22} /></span>
              <span className="text-sm font-semibold text-on-surface">{a.label}</span>
              <span className="text-xs text-on-surface-variant">{a.hint}</span>
              {a.badge ? (
                <span className="absolute end-2 top-2 min-w-5 rounded-full bg-warning-500 px-1.5 text-center text-xs font-bold text-white">{a.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Users size={24} />} label="إجمالي الطلاب" value={stats?.totalStudents ?? 0} color="primary" />
        <StatCard icon={<Clock size={24} />} label="قيد المراجعة" value={stats?.pendingStudents ?? 0} color="warning" />
        <StatCard icon={<UserCheck size={24} />} label="طلاب معتمدون" value={stats?.approvedStudents ?? 0} color="success" />
        <StatCard icon={<Award size={24} />} label="الشهادات الصادرة" value={stats?.certificatesCount ?? 0} color="info" />
      </div>
      <div className="mb-6">
        <StatCard icon={<GraduationCap size={24} />} label="الدورة النشطة" value={stats?.activeCycle?.name ?? 'لا توجد دورة نشطة'} color="primary" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="آخر طلبات التسجيل"
            action={<Link to={`${base}/approvals`} className="text-sm font-semibold text-primary-700 hover:underline">عرض الكل</Link>}
          />
          {registrations.length === 0 ? (
            <EmptyState icon={<Users size={36} />} title="لا توجد طلبات حديثة" />
          ) : (
            <div className="space-y-2">
              {registrations.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 p-3 border border-outline-variant rounded-xl">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{r.name}</p>
                    <p className="text-xs text-on-surface-variant truncate" dir="ltr">{r.email}</p>
                  </div>
                  <Badge variant={r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'error'}>
                    {r.status === 'pending' ? 'قيد المراجعة' : r.status === 'approved' ? 'معتمد' : r.status === 'rejected' ? 'مرفوض' : 'موقوف'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="آخر العمليات"
            action={isAdmin ? <Link to={`${base}/logs`} className="text-sm font-semibold text-primary-700 hover:underline">السجل الكامل</Link> : undefined}
          />
          {ops.length === 0 ? (
            <EmptyState icon={<History size={36} />} title="لا توجد عمليات مسجّلة بعد" />
          ) : (
            <div className="space-y-2">
              {ops.slice(0, 5).map((op) => (
                <div key={op.id} className="flex items-center justify-between gap-2 p-3 border border-outline-variant rounded-xl">
                  <div className="flex min-w-0 items-center gap-2">
                    <History size={16} className="shrink-0 text-on-surface-variant" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{op.operation}</p>
                      <p className="text-xs text-on-surface-variant truncate">{op.userName}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-on-surface-variant">{fmtAgo(op.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
