import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState } from '@/components/ui/Badge';
import { Input, Textarea } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { DataTable } from '@/components/ui/DataTable';
import type { User } from '@/types';
import { Search, Eye, Ban, RotateCcw, KeyRound } from 'lucide-react';

export function StudentsManagementPage() {
  const { notify } = useToast();
  const { data, loading, reload } = useAsync(() => api.getStudents() as Promise<User[]>, []);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [acting, setActing] = useState(false);

  const students = data || [];
  const filtered = students.filter((s) => s.name.includes(search) || s.email.includes(search));

  const handleSuspend = async () => {
    if (!selected) return;
    setActing(true);
    try {
      await api.suspendStudent(selected.id, suspendReason);
      notify('تم إيقاف الطالب', 'success');
      setSuspendOpen(false);
      setSuspendReason('');
      setSelected(null);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشلت العملية.', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleReinstate = async (student: User) => {
    setActing(true);
    try {
      await api.reinstateStudent(student.id);
      notify('تم تفعيل الطالب', 'success');
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشلت العملية.', 'error');
    } finally {
      setActing(false);
    }
  };

  const handleResetPassword = async (student: User) => {
    if (!confirm(`هل تريد إعادة تعيين كلمة مرور ${student.name}؟`)) return;
    setActing(true);
    try {
      await api.resetPassword(student.id);
      notify('تم إعادة تعيين كلمة المرور', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشلت العملية.', 'error');
    } finally {
      setActing(false);
    }
  };

  const statusBadge = (status: string) => {
    const map = { approved: 'success', pending: 'warning', rejected: 'error', suspended: 'error' } as const;
    const labels = { approved: 'معتمد', pending: 'قيد المراجعة', rejected: 'مرفوض', suspended: 'موقوف' };
    return <Badge variant={map[status as keyof typeof map] || 'neutral'}>{labels[status as keyof typeof labels] || status}</Badge>;
  };

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="متابعة الطلاب" subtitle="إدارة جميع الطلاب" />

      <div className="mb-4">
        <Input placeholder="بحث بالاسم أو البريد..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={18} />} />
      </div>

      <Card padded={false}>
        <DataTable<User>
          columns={[
            { key: 'name', label: 'الاسم', render: (s) => <span className="font-medium">{s.name}</span> },
            { key: 'email', label: 'البريد', render: (s) => <span dir="ltr">{s.email}</span> },
            { key: 'phone', label: 'الجوال', render: (s) => <span dir="ltr">{s.phone || '—'}</span> },
            { key: 'status', label: 'الحالة', render: (s) => statusBadge(s.status) },
            { key: 'createdAt', label: 'تاريخ التسجيل' },
            {
              key: 'actions', label: 'إجراءات', render: (s) => (
                <div className="flex items-center gap-1">
                  <button onClick={() => setSelected(s)} className="p-1.5 rounded-lg hover:bg-surface-dim text-on-surface-variant" title="عرض"><Eye size={16} /></button>
                  {s.status !== 'suspended' ? (
                    <button onClick={() => { setSelected(s); setSuspendOpen(true); }} className="p-1.5 rounded-lg hover:bg-error-50 text-error-600" title="إيقاف"><Ban size={16} /></button>
                  ) : (
                    <button onClick={() => handleReinstate(s)} disabled={acting} className="p-1.5 rounded-lg hover:bg-success-50 text-success-600" title="تفعيل"><RotateCcw size={16} /></button>
                  )}
                  <button onClick={() => handleResetPassword(s)} disabled={acting} className="p-1.5 rounded-lg hover:bg-surface-dim text-on-surface-variant" title="إعادة تعيين كلمة المرور"><KeyRound size={16} /></button>
                </div>
              ),
            },
          ]}
          rows={filtered}
          emptyMessage="لا يوجد طلاب"
        />
      </Card>

      <Dialog open={!!selected && !suspendOpen} onClose={() => setSelected(null)} title="تفاصيل الطالب">
        {selected && (
          <div className="space-y-3 text-sm">
            <Row label="الاسم" value={selected.name} />
            <Row label="البريد" value={selected.email} />
            <Row label="الجوال" value={selected.phone || '—'} />
            <Row label="الحالة" value={selected.status === 'approved' ? 'معتمد' : selected.status === 'pending' ? 'قيد المراجعة' : selected.status === 'rejected' ? 'مرفوض' : 'موقوف'} />
            <Row label="تاريخ التسجيل" value={selected.createdAt} />
            {selected.approvedAt && <Row label="تاريخ الاعتماد" value={selected.approvedAt} />}
            {selected.rejectionReason && <Row label="سبب الرفض" value={selected.rejectionReason} />}
            {selected.suspensionReason && <Row label="سبب الإيقاف" value={selected.suspensionReason} />}
          </div>
        )}
      </Dialog>

      <Dialog
        open={suspendOpen}
        onClose={() => { setSuspendOpen(false); setSuspendReason(''); }}
        title="إيقاف الطالب"
        actions={
          <>
            <Button variant="text" onClick={() => { setSuspendOpen(false); setSuspendReason(''); }}>إلغاء</Button>
            <Button variant="error" onClick={handleSuspend} loading={acting}>تأكيد الإيقاف</Button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant mb-4">سيتم إيقاف الطالب <strong className="text-on-surface">{selected?.name}</strong> ومنعه من الدخول.</p>
        <Textarea label="سبب الإيقاف" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="اكتب سبب الإيقاف..." />
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-outline-variant last:border-0">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-medium text-on-surface">{value}</span>
    </div>
  );
}
