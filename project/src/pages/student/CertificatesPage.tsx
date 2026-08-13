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

      // Small inline SVG icons (calendar / award / trending-up) for the
      // bottom info badges — plain vector paths render reliably under
      // html2canvas, unlike relying on an emoji/icon font being present.
      const iconCalendar = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f664f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`;
      const iconAward = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f664f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/></svg>`;
      const iconTrend = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f664f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>`;

      // A "banner" shape with pointed left/right tips, used for the title
      // ribbon and the name ribbon (matches the reference certificate).
      const bannerClip = 'clip-path:polygon(2.5% 0,97.5% 0,100% 50%,97.5% 100%,2.5% 100%,0 50%);';
      const bannerTip = (side: 'left' | 'right', color: string) =>
        `<div style="position:absolute;top:50%;${side}:-7px;width:14px;height:14px;background:${color};border-radius:50%;transform:translateY(-50%);"></div>`;

      const badge = (icon: string, label: string, value: string) => `
        <div style="background:#ffffff;border:1px solid #e0e4e1;border-radius:14px;padding:16px 30px;text-align:center;min-width:220px;box-shadow:0 2px 6px rgba(0,0,0,0.05);">
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;color:#424a45;font-size:16px;">
            ${icon}<span>${label}</span>
          </div>
          <div style="color:#1a1f1c;font-size:22px;font-weight:700;margin-top:8px;">${value}</div>
        </div>
      `;

      container.innerHTML = `
        <div style="width:100%;height:100%;box-sizing:border-box;position:relative;background:#faf8f2;border:3px solid #d88f20;border-radius:18px;overflow:hidden;">

          <!-- inner hairline border -->
          <div style="position:absolute;inset:16px;border:2px solid #1f664f;border-radius:12px;pointer-events:none;"></div>

          <!-- decorative corner ribbons -->
          <div style="position:absolute;top:0;right:0;width:520px;height:520px;overflow:hidden;pointer-events:none;">
            <div style="position:absolute;top:70px;right:-160px;width:640px;height:120px;background:linear-gradient(135deg,#154034,#2d8068);transform:rotate(45deg);box-shadow:0 4px 0 0 #d88f20, 0 -4px 0 0 #d88f20;"></div>
          </div>
          <div style="position:absolute;bottom:0;left:0;width:520px;height:520px;overflow:hidden;pointer-events:none;">
            <div style="position:absolute;bottom:70px;left:-160px;width:640px;height:120px;background:linear-gradient(315deg,#154034,#2d8068);transform:rotate(45deg);box-shadow:0 4px 0 0 #d88f20, 0 -4px 0 0 #d88f20;"></div>
          </div>

          <!-- main content -->
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding:56px 90px 44px;box-sizing:border-box;">

            <img src="/logo.png" style="width:84px;height:84px;object-fit:contain;" />
            <div style="color:#1f664f;font-size:22px;font-weight:700;margin-top:6px;">زاد الحلقات</div>

            <!-- title banner -->
            <div style="position:relative;width:520px;margin-top:34px;">
              ${bannerTip('right', '#d88f20')}${bannerTip('left', '#d88f20')}
              <div style="background:linear-gradient(180deg,#1f664f,#154034);${bannerClip}padding:24px 40px;text-align:center;">
                <span style="color:#f8ecca;font-size:32px;font-weight:700;">شهادة إنجاز</span>
              </div>
            </div>

            <div style="color:#1a1f1c;font-size:23px;margin-top:30px;">تشهد منصة زاد الحلقات بأن الأخ / ة :</div>

            <!-- name banner -->
            <div style="position:relative;width:620px;margin-top:20px;">
              ${bannerTip('right', '#d88f20')}${bannerTip('left', '#d88f20')}
              <div style="background:linear-gradient(180deg,#fdf8ed,#f1d693);border:2px solid #d88f20;${bannerClip}padding:22px 40px;text-align:center;">
                <span style="color:#703917;font-size:36px;font-weight:700;">${escapeHtml(cert.studentName)}</span>
              </div>
            </div>

            <div style="color:#1a1f1c;font-size:23px;margin-top:26px;">قد أتمّ برنامج</div>

            <!-- cycle pill -->
            <div style="background:linear-gradient(180deg,#f1d693,#e3a738);border-radius:40px;padding:16px 52px;margin-top:18px;">
              <span style="color:#3f1c09;font-size:26px;font-weight:700;">${escapeHtml(cert.cycleName)}</span>
            </div>

            <!-- info badges -->
            <div style="display:flex;gap:24px;margin-top:auto;padding-top:34px;">
              ${badge(iconCalendar, 'تاريخ الإصدار', escapeHtml(cert.issueDate))}
              ${badge(iconAward, 'رقم الشهادة', escapeHtml(cert.certificateNumber))}
              ${badge(iconTrend, 'نسبة الإنجاز', `${cert.progressPercent}%`)}
            </div>
          </div>

          ${qrDataUrl ? `<img src="${qrDataUrl}" style="position:absolute;bottom:34px;right:34px;width:96px;height:96px;background:#fff;padding:6px;border-radius:8px;border:1px solid #e0e4e1;" />` : ''}
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
