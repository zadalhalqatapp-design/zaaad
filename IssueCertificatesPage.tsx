import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { Dialog } from '@/components/ui/Dialog';
import { Select, Input } from '@/components/ui/Input';
import type { User, Certificate, Cycle } from '@/types';
import { Award, Search } from 'lucide-react';

export function IssueCertificatesPage() {
  const { notify } = useToast();
  const { data: studentsData, loading } = useAsync(() => api.getStudents() as Promise<User[]>, []);
  const { data: certsData, reload: reloadCerts } = useAsync(() => api.getCertificates() as Promise<Certificate[]>, []);
  const { data: cyclesData } = useAsync(() => api.getCycles() as Promise<Cycle[]>, []);

  const [search, setSearch] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [target, setTarget] = useState<User | null>(null);
  const [cycleId, setCycleId] = useState('');
  const [issuing, setIssuing] = useState(false);

  const students = (studentsData || []).filter((s) => s.status === 'approved');
  const certificates = certsData || [];
  const cycles = cyclesData || [];
  const filtered = students.filter((s) => s.name.includes(search) || s.email.includes(search));

  const hasCert = (studentId: string) => certificates.some((c) => c.studentId === studentId);

  const openIssue = (student: User) => {
    setTarget(student);
    setCycleId(cycles.find((c) => c.status === 'active')?.id || cycles[0]?.id || '');
    setIssueOpen(true);
  };

  const handleIssue = async () => {
    if (!target || !cycleId) {
      notify('يرجى اختيار دورة.', 'warning');
      return;
    }
    setIssuing(true);
    try {
      await api.issueCertificate(target.id, cycleId);
      notify(`تم إصدار شهادة ${target.name}`, 'success');
      setIssueOpen(false);
      setTarget(null);
      reloadCerts();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'فشل الإصدار.', 'error');
    } finally {
      setIssuing(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="إصدار الشهادات" subtitle="إصدار شهادات الإنجاز للطلاب" />

      {students.length === 0 ? (
        <Card><EmptyState icon={<Award size={40} />} title="لا يوجد طلاب معتمدون" /></Card>
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
                { key: 'createdAt', label: 'تاريخ التسجيل' },
                {
                  key: 'cert', label: 'الشهادة', render: (s) => hasCert(s.id) ? <Badge variant="success">مصدرة</Badge> : <Badge variant="neutral">لا توجد</Badge>,
                },
                {
                  key: 'actions', label: 'إجراء', render: (s) => (
                    <Button size="sm" icon={<Award size={16} />} onClick={() => openIssue(s)} disabled={hasCert(s.id)}>
                      إصدار شهادة
                    </Button>
                  ),
                },
              ]}
              rows={filtered}
              emptyMessage="لا يوجد طلاب"
            />
          </Card>

          <Dialog
            open={issueOpen}
            onClose={() => { setIssueOpen(false); setTarget(null); }}
            title="إصدار شهادة"
            actions={
              <>
                <Button variant="text" onClick={() => { setIssueOpen(false); setTarget(null); }}>إلغاء</Button>
                <Button onClick={handleIssue} loading={issuing} icon={<Award size={18} />}>إصدار</Button>
              </>
            }
          >
            <p className="text-sm text-on-surface-variant mb-4">سيتم إصدار شهادة للطالب <strong className="text-on-surface">{target?.name}</strong>.</p>
            <Select label="الدورة" value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
              <option value="">اختر الدورة...</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.status === 'active' ? 'نشطة' : 'مكتملة'})</option>
              ))}
            </Select>
            {cycles.length === 0 && (
              <p className="text-xs text-warning-600 mt-2">لا توجد دورات. يجب إنشاء دورة أولًا من إدارة البرنامج.</p>
            )}
          </Dialog>
        </>
      )}
    </div>
  );
}
