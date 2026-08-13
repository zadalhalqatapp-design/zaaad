import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AppSettings, Certificate } from '@/types';
import { Award, Download, CheckCircle } from 'lucide-react';
import { generateCertificatePDF } from '@/lib/certificate';

export function StudentCertificates() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { data, loading, reload } = useAsync(
    () => api.getCertificates(user!.id) as Promise<Certificate[]>,
    [user?.id],
  );
  const { data: settings } = useAsync(() => api.getSettings() as Promise<AppSettings>, []);

  const certificates = data || [];

  const generatePDF = async (cert: Certificate) => {
    try {
      notify('جارٍ إعداد الشهادة...', 'info');
      // استخدم الاسم الكامل من حساب الطالب إذا كان متاحًا؛
      // وإذا لم يكن أطول/متاحًا نحتفظ بالاسم المخزن في الشهادة.
      const fullStudentName =
        typeof user?.name === 'string' && user.name.trim().length > cert.studentName.trim().length
          ? user.name.trim()
          : cert.studentName;

      await generateCertificatePDF(
        { ...cert, studentName: fullStudentName },
        {
          logoUrl: settings?.logoUrl,
          signatureUrl: settings?.signatureUrl,
          appName: settings?.appName,
        },
      );
      notify('تم تنزيل الشهادة', 'success');
    } catch {
      notify('تعذّر إنشاء ملف الشهادة.', 'error');
    }
  };

  if (loading) return <div className="py-20 text-center text-on-surface-variant">جارٍ التحميل...</div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="شهاداتي" subtitle="الشهادات التي حصلت عليها من البرنامج" />

      {certificates.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Award size={48} />}
            title="لا توجد شهادات بعد"
            description="ستظهر شهاداتك هنا بعد إكمال البرنامج وإصدارها من قبل المشرف."
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {certificates.map((cert) => (
            <Card key={cert.id} className="overflow-hidden">
              <div className="bg-gradient-to-l from-primary-600 to-primary-700 text-white p-5 -m-5 mb-4">
                <div className="flex items-center justify-between">
                  <Award size={32} />
                  <Badge variant="success">معتمدة</Badge>
                </div>
                <h3 className="text-lg font-bold mt-3">{cert.cycleName}</h3>
              </div>
              <div className="space-y-2 mb-4">
                <Row label="رقم الشهادة" value={cert.certificateNumber} />
                <Row label="تاريخ الإصدار" value={cert.issueDate} />
                <Row label="نسبة الإنجاز" value={`${cert.progressPercent}%`} />
              </div>
              <Button fullWidth icon={<Download size={18} />} onClick={() => generatePDF(cert)}>
                تنزيل الشهادة (PDF — A4 أفقي)
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-medium text-on-surface">{value}</span>
    </div>
  );
}
