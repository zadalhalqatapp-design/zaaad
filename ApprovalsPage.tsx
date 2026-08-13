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
import { Search, Check, X } from 'lucide-react';

export function ApprovalsPage() {
  const { notify } = useToast();
  const { data, loading, reload } = useAsync(() => api.getStudents() as Promise<User[]>, []);

  const [search, setSearch] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  const allStudents = data || [];
  const pending = allStudents.filter((s) => s.status === 'pending');
  const filtered = pending.filter((s) => s.name.includes(search) || s.email.includes(search));

  const handleApprove = async (student: User) => {
    setActing(true);
    try {
      await api.approveStudent(student.id);
      notify(`تم اعتماد الطالب ${student.name}`, 'success');
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الاعتماد.', 'error');
    } finally {
      setActing(false);
    }
  };

  const openReject = (student: User) => {
    setRejectTarget(student);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      notify('يرجى كتابة سبب الرفض.', 'warning');
      return;
    }
    setActing(true);
    try {
      await api.rejectStudent(rejectTarget.id, rejectReason);
      notify(`تم رفض طلب ${rejectTarget.name}`, 'success');
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectReason('');
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الرفض.', 'error');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="طلبات التسجيل"
        subtitle={`${pending.length} طلب قيد المراجعة`}
      />

      {pending.length === 0 ? (
        <Card><EmptyState icon={<Check size={40} />} title="لا توجد طلبات قيد المراجعة" description="جميع الطلبات تمت معالجتها." /></Card>
      ) : (
        <>
          <div className="mb-4">
            <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={18} />} />
          </div>

          <Card padded={false}>
            <DataTable<User>
              columns={[
                { key: 'name', label: 'الاسم', render: (s) => <span className="font-medium">{s.name}</span> },
                { key: 'email', label: 'البريد', render: (s) => <span dir="ltr">{s.email}</span> },
                { key: 'phone', label: 'الجوال', render: (s) => <span dir="ltr">{s.phone || '—'}</span> },
                { key: 'createdAt', label: 'تاريخ الطلب' },
                {
                  key: 'actions', label: 'إجراءات', render: (s) => (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outlined" icon={<Check size={16} />} onClick={() => handleApprove(s)} disabled={acting}>
                        اعتماد
                      </Button>
                      <Button size="sm" variant="error" icon={<X size={16} />} onClick={() => openReject(s)} disabled={acting}>
                        رفض
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={filtered}
              emptyMessage="لا توجد طلبات مطابقة"
            />
          </Card>
        </>
      )}

      <Dialog
        open={rejectOpen}
        onClose={() => { setRejectOpen(false); setRejectTarget(null); }}
        title="رفض طلب التسجيل"
        actions={
          <>
            <Button variant="text" onClick={() => { setRejectOpen(false); setRejectTarget(null); }}>إلغاء</Button>
            <Button variant="error" onClick={handleReject} loading={acting}>تأكيد الرفض</Button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant mb-4">سيتم رفض طلب <strong className="text-on-surface">{rejectTarget?.name}</strong>.</p>
        <Textarea label="سبب الرفض" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="اكتب سبب الرفض..." />
      </Dialog>
    </div>
  );
}
