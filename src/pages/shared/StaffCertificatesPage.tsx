import { useState } from 'react';
import { Award, Download, Search } from 'lucide-react';
import { api } from '@/api';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { fmtDate } from '@/lib/format';
import type { AppSettings, Certificate } from '@/types';

/**
 * شهادات الطلاب للإدارة: المدير يرى شهادات كل الطلاب، والمشرف شهادات طلاب دورته المسندة فقط
 * (الخادم هو من يرشّح حسب الدور). يمكن البحث والتصفية بالدورة وتنزيل الشهادة PDF لأي طالب.
 */
export function StaffCertificatesPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const isAdmin = user?.role === 'admin';
  const { data, loading } = useAsync(() => api.getCertificates() as Promise<Certificate[]>, []);
  const { data: settings } = useAsync(() => api.getSettings() as Promise<AppSettings>, []);
  const [q, setQ] = useState('');
  const [cycle, setCycle] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const certs = (data ?? []).slice().sort((a, b) => String(b.issueDate).localeCompare(String(a.issueDate)));
  const cycleNames = Array.from(new Set(certs.map((c) => c.cycleName).filter(Boolean)));
  const needle = q.trim();
  const rows = certs.filter(
    (c) => (!cycle || c.cycleName === cycle) && (!needle || c.studentName.includes(needle) || c.certificateNumber.includes(needle) || (c.bookTitle || '').includes(needle)),
  );

  const download = async (cert: Certificate) => {
    setBusyId(cert.id);
    try {
      notify('جارٍ إعداد الشهادة...', 'info');
      const { generateCertificatePDF } = await import('@/lib/certificate');
      await generateCertificatePDF(cert, { logoUrl: settings?.logoUrl, signatureUrl: settings?.signatureUrl, appName: settings?.appName });
      notify('تم تنزيل الشهادة', 'success');
    } catch {
      notify('تعذّر إنشاء ملف الشهادة.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="شهادات الطلاب"
        subtitle={isAdmin ? `${certs.length} شهادة لجميع الطلاب` : `${certs.length} شهادة لطلاب دورتك`}
      />

      {certs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Award size={40} />}
            title="لا توجد شهادات صادرة بعد"
            description={isAdmin ? 'تظهر هنا الشهادات بعد إصدارها من «إصدار الشهادات».' : 'تظهر هنا شهادات طلاب دورتك بعد أن يصدرها المدير.'}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
            <Input placeholder="ابحث بالاسم أو رقم الشهادة أو الكتاب..." value={q} onChange={(e) => setQ(e.target.value)} icon={<Search size={18} />} />
            {cycleNames.length > 1 && (
              <select
                value={cycle}
                onChange={(e) => setCycle(e.target.value)}
                aria-label="الدورة"
                className="rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              >
                <option value="">كل الدورات</option>
                {cycleNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
          <Card padded={false}>
            <DataTable<Certificate>
              columns={[
                { key: 'studentName', label: 'الطالب', render: (c) => <span className="font-medium">{c.studentName}</span> },
                { key: 'bookTitle', label: 'الكتاب', render: (c) => c.bookTitle || '—' },
                { key: 'cycleName', label: 'الدورة', render: (c) => c.cycleName || '—' },
                { key: 'grade', label: 'التقدير', render: (c) => c.grade || '—' },
                { key: 'progressPercent', label: 'النسبة', render: (c) => `${c.progressPercent}%` },
                { key: 'certificateNumber', label: 'الرقم', render: (c) => <span dir="ltr" className="font-mono text-xs">{c.certificateNumber}</span> },
                { key: 'issueDate', label: 'التاريخ', render: (c) => fmtDate(c.issueDate) },
                {
                  key: 'actions',
                  label: 'إجراءات',
                  render: (c) => (
                    <Button size="sm" variant="outlined" icon={<Download size={16} />} loading={busyId === c.id} onClick={() => download(c)}>
                      تنزيل PDF
                    </Button>
                  ),
                },
              ]}
              rows={rows}
              emptyMessage="لا توجد شهادات مطابقة"
            />
          </Card>
        </>
      )}
    </div>
  );
}
