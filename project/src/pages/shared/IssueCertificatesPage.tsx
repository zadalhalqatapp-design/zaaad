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
import type { User, Certificate, Cycle, Book, BookAssignment } from '@/types';

const DEFAULT_BOOK_ID = 'book_default';
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
  const [bookId, setBookId] = useState('');
  const [issuing, setIssuing] = useState(false);

  const { data: booksData } = useAsync(() => api.getBooks().catch(() => [] as Book[]), []);
  const { data: assignmentsData } = useAsync(() => api.getBookAssignments().catch(() => [] as BookAssignment[]), []);
  const books = booksData || [];
  const assignments = assignmentsData || [];

  const students = (studentsData || []).filter((s) => s.status === 'approved');
  const certificates = certsData || [];
  const cycles = cyclesData || [];
  const filtered = students.filter((s) => s.name.includes(search) || s.email.includes(search));

  const certBookId = (c: Certificate) => c.bookId || DEFAULT_BOOK_ID;
  // كتب الطالب المعيَّنة له فقط (وإن لم تكن هناك تعيينات نعرض كل الكتب)
  const booksOf = (studentId: string) => {
    const mine = new Set(assignments.filter((a) => a.studentId === studentId).map((a) => a.bookId));
    const list = books.filter((b) => mine.has(b.id));
    return list.length > 0 ? list : books;
  };
  const hasCertFor = (studentId: string, bId: string) =>
    certificates.some((c) => c.studentId === studentId && certBookId(c) === bId);
  const certCount = (studentId: string) => certificates.filter((c) => c.studentId === studentId).length;
  // الطالب مكتمل الشهادات إن أُصدرت شهادة لكل كتبه
  const allIssued = (studentId: string) => {
    const list = booksOf(studentId);
    return list.length > 0 ? list.every((b) => hasCertFor(studentId, b.id)) : certCount(studentId) > 0;
  };

  const openIssue = (student: User) => {
    setTarget(student);
    setCycleId(cycles.find((c) => c.status === 'active')?.id || cycles[0]?.id || '');
    const pending = booksOf(student.id).find((b) => !hasCertFor(student.id, b.id));
    setBookId(pending?.id || '');
    setIssueOpen(true);
  };

  const handleIssue = async () => {
    if (!target || !cycleId) {
      notify('يرجى اختيار دورة.', 'warning');
      return;
    }
    if (books.length > 0 && !bookId) {
      notify('يرجى اختيار الكتاب.', 'warning');
      return;
    }
    setIssuing(true);
    try {
      await api.issueCertificate(target.id, cycleId, bookId || undefined);
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
                  key: 'cert', label: 'الشهادات', render: (s) => certCount(s.id) > 0
                    ? <Badge variant="success">{certCount(s.id)} مصدرة</Badge>
                    : <Badge variant="neutral">لا توجد</Badge>,
                },
                {
                  key: 'actions', label: 'إجراء', render: (s) => (
                    <Button size="sm" icon={<Award size={16} />} onClick={() => openIssue(s)} disabled={allIssued(s.id)}>
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
            {books.length > 0 && target && (
              <div className="mb-4">
                <Select label="الكتاب" value={bookId} onChange={(e) => setBookId(e.target.value)}>
                  <option value="">اختر الكتاب...</option>
                  {booksOf(target.id).map((b) => (
                    <option key={b.id} value={b.id} disabled={hasCertFor(target.id, b.id)}>
                      {b.title}{hasCertFor(target.id, b.id) ? ' (صدرت شهادته)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
            )}
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
