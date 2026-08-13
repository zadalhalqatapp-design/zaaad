import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard, EmptyState, Badge } from '@/components/ui/Badge';
import type { DashboardData } from '@/types';
import { Users, UserCheck, Award, BookOpen, Clock, History } from 'lucide-react';

export function ManagementDashboard() {
  const { user } = useAuth();
  const { data, loading } = useAsync(() => api.getDashboard() as unknown as Promise<DashboardData>, []);

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ تحميل لوحة التحكم...</div>;

  const stats = data?.stats;
  const ops = data?.recentOperations || [];
  const registrations = data?.recentRegistrations || [];

  return (
    <div className="animate-fade-in">
      <PageHeader title={`مرحبًا، ${user?.name}`} subtitle="لوحة التحكم الإدارية" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Users size={24} />} label="إجمالي الطلاب" value={stats?.totalStudents ?? 0} color="primary" />
        <StatCard icon={<Clock size={24} />} label="طلبات قيد المراجعة" value={stats?.pendingStudents ?? 0} color="warning" />
        <StatCard icon={<UserCheck size={24} />} label="طلاب معتمدون" value={stats?.approvedStudents ?? 0} color="success" />
        <StatCard icon={<Award size={24} />} label="الشهادات" value={stats?.certificatesCount ?? 0} color="info" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="طلبات التسجيل الأخيرة" subtitle="الطلبات الجديدة" />
          {registrations.length === 0 ? (
            <EmptyState icon={<Users size={36} />} title="لا توجد طلبات جديدة" />
          ) : (
            <div className="space-y-2">
              {registrations.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 border border-outline-variant rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-on-surface">{r.name}</p>
                    <p className="text-xs text-on-surface-variant">{r.email}</p>
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
          <CardHeader title="آخر العمليات" subtitle="سجل النشاطات الأخيرة" />
          {ops.length === 0 ? (
            <EmptyState icon={<History size={36} />} title="لا توجد عمليات" />
          ) : (
            <div className="space-y-2">
              {ops.slice(0, 5).map((op) => (
                <div key={op.id} className="flex items-center justify-between p-3 border border-outline-variant rounded-xl">
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-on-surface-variant" />
                    <div>
                      <p className="text-sm font-medium text-on-surface">{op.operation}</p>
                      <p className="text-xs text-on-surface-variant">{op.userName}</p>
                    </div>
                  </div>
                  <span className="text-xs text-on-surface-variant">{op.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
