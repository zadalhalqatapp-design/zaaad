/**
 * إصدار شهادة الإنجاز (PDF) — منصة زاد الحلقات
 * ------------------------------------------------
 * لماذا لا نستخدم jsPDF لرسم النص مباشرة؟
 * خطوط jsPDF المدمجة (helvetica, times, courier) لاتينية فقط، ولا تدعم
 * تشكيل/ربط الحروف العربية (Arabic shaping) ولا اتجاه RTL. حتى مع تضمين
 * خط عربي (TTF) داخل jsPDF فإن النص يظهر كحروف منفصلة غير مترابطة لأن
 * jsPDF لا يقوم بعملية الـ shaping بنفسه.
 *
 * الحل: نبني الشهادة كعنصر HTML حقيقي (المتصفح يتكفّل بتشكيل العربية
 * واتجاه RTL بشكل صحيح تلقائيًا، تمامًا كباقي صفحات التطبيق)، ثم نحوّله
 * إلى صورة عالية الدقة عبر html2canvas، ونضعها كصفحة واحدة داخل PDF
 * بمقاس A4 Landscape حقيقي (297×210mm) — فتبقى نسب الطباعة دقيقة تمامًا
 * دون أي تمدد أو قص عند التصدير.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import type { AppSettings, Certificate } from '@/types';

// ===== الهوية البصرية =====
const COLORS = {
  darkGreen: '#064E3B',
  medGreen: '#0F6B4F',
  gold: '#C9A227',
  lightGold: '#D9B85B',
  ivory: '#FAF8F2',
  white: '#FFFFFF',
  grayText: '#555555',
} as const;

// حجم لوحة الرسم: نسبة A4 landscape (297×210mm) تمامًا، مقاس مضاعف
// لدقة طباعة عالية (يصدر بمخرج نهائي ~300dpi عبر scale في html2canvas).
const CANVAS_W = 1754;
const CANVAS_H = 1240;

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

/** نص الدعاء أسفل الشهادة — يتغيّر الضمير تلقائيًا إذا توفّر جنس الطالب،
 *  وإلا يبقى بصيغة الحالتين معًا (الصيغة الافتراضية الآمنة). */
function getDuaText(gender?: 'male' | 'female'): string {
  if (gender === 'male') {
    return 'نسأل الله له دوام التوفيق والسداد، وأن يجعل ما تعلّمه في ميزان حسناته، ويبارك في جهده وعلمه.';
  }
  if (gender === 'female') {
    return 'نسأل الله لها دوام التوفيق والسداد، وأن يجعل ما تعلّمته في ميزان حسناتها، ويبارك في جهدها وعلمها.';
  }
  return 'نسأل الله له / لها دوام التوفيق والسداد، وأن يجعل ما تعلّمه في ميزان حسناته، ويبارك في جهده وعلمه.';
}

// أيقونات SVG بسيطة (لا تعتمد على خط أيقونات خارجي، فترسم بثبات مع html2canvas)
const ICONS = {
  trend: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${COLORS.medGreen}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>`,
  award: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${COLORS.medGreen}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/></svg>`,
  calendar: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${COLORS.medGreen}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
};

/** خلفية زخرفية خفيفة جدًا: نقش هندسي إسلامي متكرر (SVG pattern) بشفافية
 *  منخفضة + موجتان جانبيتان — بدون أي صورة، فتبقى الشهادة خفيفة الحجم. */
function buildBackgroundLayer(): string {
  return `
    <svg width="100%" height="100%" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" style="position:absolute;inset:0;" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="geo" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="46" height="46" fill="none"/>
          <path d="M23 0 L46 23 L23 46 L0 23 Z" fill="none" stroke="${COLORS.medGreen}" stroke-width="0.7" opacity="0.05"/>
          <circle cx="23" cy="23" r="4" fill="none" stroke="${COLORS.gold}" stroke-width="0.6" opacity="0.06"/>
        </pattern>
      </defs>
      <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#geo)"/>
      <path d="M0 ${CANVAS_H * 0.72} Q ${CANVAS_W * 0.18} ${CANVAS_H * 0.62} ${CANVAS_W * 0.38} ${CANVAS_H * 0.74} T ${CANVAS_W * 0.05} ${CANVAS_H} Z"
            fill="${COLORS.medGreen}" opacity="0.035"/>
      <path d="M${CANVAS_W} ${CANVAS_H * 0.18} Q ${CANVAS_W * 0.82} ${CANVAS_H * 0.28} ${CANVAS_W * 0.7} ${CANVAS_H * 0.1} T ${CANVAS_W} 0 Z"
            fill="${COLORS.gold}" opacity="0.05"/>
    </svg>
  `;
}

/** زاوية زخرفية بسيطة (ربع دائرة + نقطة) بأربع اتجاهات */
function buildCorner(pos: 'tl' | 'tr' | 'bl' | 'br'): string {
  const map: Record<string, string> = {
    tl: 'top:22px;left:22px;transform:rotate(0deg);',
    tr: 'top:22px;right:22px;transform:scaleX(-1);',
    bl: 'bottom:22px;left:22px;transform:scaleY(-1);',
    br: 'bottom:22px;right:22px;transform:scale(-1,-1);',
  };
  return `
    <svg width="46" height="46" viewBox="0 0 46 46" style="position:absolute;${map[pos]}" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 30 Q2 2 30 2" fill="none" stroke="${COLORS.gold}" stroke-width="2.5"/>
      <circle cx="30" cy="2" r="3" fill="${COLORS.gold}"/>
    </svg>
  `;
}

function buildInfoBadge(icon: string, label: string, value: string): string {
  return `
    <div style="background:${COLORS.ivory};border:1px solid ${COLORS.gold};border-radius:10px;padding:14px 26px;text-align:center;min-width:190px;">
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;color:${COLORS.grayText};font-size:14px;">
        ${icon}<span>${label}</span>
      </div>
      <div style="color:${COLORS.darkGreen};font-size:20px;font-weight:700;margin-top:6px;">${value}</div>
    </div>
  `;
}

interface CertificateAssets {
  logoUrl?: string;
  signatureUrl?: string;
  appName?: string;
}

/**
 * يبني قالب HTML الكامل للشهادة داخل عنصر منفصل (خارج الشاشة)، يحوّله
 * إلى صورة عالية الدقة، ثم يضعها كصفحة PDF بمقاس A4 landscape حقيقي،
 * ويبدأ تنزيلها في المتصفح.
 */
export async function generateCertificatePDF(cert: Certificate, assets: CertificateAssets = {}): Promise<void> {
  const appName = assets.appName || 'زاد الحلقات';
  const logoSrc = assets.logoUrl && assets.logoUrl.trim() ? assets.logoUrl : '/logo.png';

  const qrPayload = JSON.stringify({
    id: cert.id,
    num: cert.certificateNumber,
    student: cert.studentName,
    date: cert.issueDate,
  });
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 220, margin: 1, color: { dark: COLORS.darkGreen, light: '#00000000' } });
  } catch {
    // فشل توليد QR لا يجب أن يمنع إصدار الشهادة
  }

  const signatureBlock = assets.signatureUrl && assets.signatureUrl.trim()
    ? `<img src="${assets.signatureUrl}" style="height:56px;object-fit:contain;margin-bottom:4px;" />`
    : `<div style="height:56px;"></div>`;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-99999px';
  container.style.width = `${CANVAS_W}px`;
  container.style.height = `${CANVAS_H}px`;
  container.dir = 'rtl';
  container.style.fontFamily = "'Cairo', system-ui, sans-serif";
  container.style.background = COLORS.ivory;

  container.innerHTML = `
    <!-- @page { size: A4 landscape; margin: 0; } — الحجم الفعلي عند
         التصدير يُضبط في jsPDF (format: a4, orientation: landscape)
         فتبقى نسبة 297×210mm دقيقة بغض النظر عن دقة المعاينة هنا. -->
    <div style="width:${CANVAS_W}px;height:${CANVAS_H}px;box-sizing:border-box;position:relative;background:${COLORS.ivory};overflow:hidden;">

      ${buildBackgroundLayer()}

      <!-- الإطار المزدوج: خارجي أخضر داكن + داخلي ذهبي رفيع -->
      <div style="position:absolute;inset:26px;border:4px solid ${COLORS.darkGreen};border-radius:6px;pointer-events:none;"></div>
      <div style="position:absolute;inset:38px;border:1.5px solid ${COLORS.gold};border-radius:4px;pointer-events:none;"></div>

      ${buildCorner('tl')}${buildCorner('tr')}${buildCorner('bl')}${buildCorner('br')}

      <!-- شعار المنصة — أعلى اليسار -->
      <div style="position:absolute;top:56px;left:64px;display:flex;flex-direction:column;align-items:center;">
        <img src="${logoSrc}" style="width:60px;height:60px;object-fit:contain;" />
        <div style="color:${COLORS.darkGreen};font-size:16px;font-weight:700;margin-top:4px;">${escapeHtml(appName)}</div>
      </div>

      <!-- عنوان الشهادة — أعلى الوسط -->
      <div style="position:absolute;top:52px;left:0;right:0;display:flex;flex-direction:column;align-items:center;">
        <div style="color:${COLORS.darkGreen};font-size:22px;font-weight:700;letter-spacing:1px;">شهادة إنجاز</div>
        <div style="width:120px;height:2px;background:${COLORS.gold};margin-top:8px;"></div>
      </div>

      <!-- المحتوى المركزي -->
      <div style="position:absolute;top:150px;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;padding:0 150px;box-sizing:border-box;">

        <div style="color:${COLORS.grayText};font-size:18px;margin-top:6px;">تشهد منصة ${escapeHtml(appName)} بأن الأخ / ت :</div>

        <div style="color:${COLORS.darkGreen};font-size:36px;font-weight:700;margin-top:14px;">${escapeHtml(cert.studentName)}</div>
        <div style="width:220px;height:2px;background:linear-gradient(90deg, transparent, ${COLORS.gold}, transparent);margin-top:10px;"></div>

        <div style="color:${COLORS.grayText};font-size:18px;margin-top:22px;">قد أتم برنامج</div>
        <div style="color:${COLORS.darkGreen};font-size:28px;font-weight:700;margin-top:8px;">${escapeHtml(cert.cycleName)}</div>

        <!-- خانات معلومات الإنجاز -->
        <div style="display:flex;gap:20px;margin-top:26px;">
          ${buildInfoBadge(ICONS.trend, 'نسبة الإنجاز', `${cert.progressPercent}%`)}
          ${buildInfoBadge(ICONS.award, 'رقم الشهادة', escapeHtml(cert.certificateNumber))}
          ${buildInfoBadge(ICONS.calendar, 'تاريخ الإصدار', escapeHtml(cert.issueDate))}
        </div>

        <!-- نص الدعاء -->
        <div style="color:${COLORS.grayText};font-size:13.5px;margin-top:22px;max-width:620px;line-height:1.9;">
          ${escapeHtml(getDuaText(cert.studentGender))}
        </div>

        <!-- التوقيع والباركود -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;width:100%;margin-top:auto;padding-bottom:8px;">

          <div style="text-align:center;">
            <div style="color:${COLORS.grayText};font-size:13px;margin-bottom:2px;">التوقيع</div>
            ${signatureBlock}
            <div style="width:150px;border-top:1px solid ${COLORS.grayText};padding-top:6px;font-size:13px;color:${COLORS.darkGreen};font-weight:700;">${escapeHtml(appName)}</div>
          </div>

          ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:88px;height:88px;" />` : '<div></div>'}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // التأكد من تحميل خط Cairo العربي فعليًا قبل التصوير، وإلا قد يُرسم
    // النص بخط بديل غير مضبوط عند html2canvas.
    if ('fonts' in document) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(container, {
      scale: 2, // إخراج نهائي ≈300dpi لطباعة احترافية
      backgroundColor: COLORS.ivory,
      useCORS: true,
    });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();  // 297mm
    const pageH = pdf.internal.pageSize.getHeight(); // 210mm
    pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
    pdf.save(`certificate-${cert.certificateNumber}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
