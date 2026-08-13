import { useAsync } from '@/hooks/useAsync';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Certificate } from '@/types';
import { Award, Download, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

export function StudentCertificates() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { data, loading, reload } = useAsync(
    () => api.getCertificates(user!.id) as Promise<Certificate[]>,
    [user?.id],
  );

  const certificates = data || [];

  const generatePDF = async (cert: Certificate) => {
    // jsPDF's built-in fonts (helvetica etc.) only cover Latin glyphs and
    // cannot shape/join Arabic letters, so drawing Arabic text directly
    // with pdf.text() renders as boxes/garbled symbols. Instead we render
    // the certificate as real HTML (the browser shapes Arabic correctly,
    // same as the rest of the RTL app), rasterize it with html2canvas,
    // and drop that single image into the PDF page.
    let container: HTMLDivElement | null = null;
    try {
      notify('جارٍ إعداد الشهادة...', 'info');

      const qrData = JSON.stringify({ id: cert.id, num: cert.certificateNumber, student: cert.studentName, date: cert.issueDate });
      let qrDataUrl = '';
      try {
        qrDataUrl = await QRCode.toDataURL(qrData, { width: 240, margin: 1 });
      } catch {
        // QR generation failure shouldn't block certificate creation
      }

      // Design canvas at a high pixel size (landscape A4 aspect ratio,
      // ~2x print resolution) so the exported PDF stays crisp.
      const W = 2000;
      const H = 1414;

      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '-99999px';
      container.style.width = `${W}px`;
      container.style.height = `${H}px`;
      container.dir = 'rtl';
      container.style.fontFamily = "'Cairo', system-ui, sans-serif";
      container.style.background = '#f7f9f8';
      container.style.boxSizing = 'border-box';
      container.style.padding = '28px';

      container.innerHTML = `
        <div style="width:100%;height:100%;box-sizing:border-box;border:5px solid #1f664f;padding:10px;position:relative;">
          <div style="width:100%;height:100%;box-sizing:border-box;border:2px solid #d88f20;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;position:relative;">

            <div style="color:#1f664f;font-size:56px;font-weight:700;">زاد الحلقات</div>
            <div style="color:#424a45;font-size:26px;margin-top:8px;">شهادة إتمام</div>

            <div style="width:160px;height:3px;background:#d88f20;margin:28px 0;"></div>

            <div style="color:#1a1f1c;font-size:44px;font-weight:700;">${escapeHtml(cert.studentName)}</div>

            <div style="color:#424a45;font-size:24px;margin-top:22px;">أتمّ بنجاح برنامج</div>
            <div style="color:#1f664f;font-size:34px;font-weight:700;margin-top:10px;">${escapeHtml(cert.cycleName)}</div>

            <div style="color:#424a45;font-size:22px;margin-top:24px;">نسبة الإنجاز: ${cert.progressPercent}%</div>

            <div style="color:#424a45;font-size:18px;margin-top:18px;">
              <div>رقم الشهادة: ${escapeHtml(cert.certificateNumber)}</div>
              <div style="margin-top:4px;">تاريخ الإصدار: ${escapeHtml(cert.issueDate)}</div>
            </div>

            ${qrDataUrl ? `<img src="${qrDataUrl}" style="position:absolute;bottom:36px;right:36px;width:130px;height:130px;" />` : ''}

            <div style="position:absolute;bottom:36px;left:36px;text-align:center;">
              <div style="width:170px;border-top:1px solid #787878;padding-top:8px;font-size:16px;color:#424a45;">التوقيع المعتمد</div>
            </div>

          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Make sure the Arabic webfont (Cairo) is actually loaded before
      // rasterizing, otherwise html2canvas can capture a fallback font.
      if ('fonts' in document) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#f7f9f8', useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);

      pdf.save(`certificate-${cert.certificateNumber}.pdf`);
      notify('تم تنزيل الشهادة', 'success');
    } catch {
      notify('تعذّر إنشاء ملف الشهادة.', 'error');
    } finally {
      if (container) document.body.removeChild(container);
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
                تنزيل الشهادة (PDF)
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-medium text-on-surface">{value}</span>
    </div>
  );
}
