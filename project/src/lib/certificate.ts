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

// مقاس الشهادة المنطقي: A4 أفقي حقيقي.
const PAGE_W_MM = 297;
const PAGE_H_MM = 210;

// التصميم يُبنى بالـmm، ثم يُرسم بدقة عالية في html2canvas.
const DESIGN_DPI = 150;
const MM_TO_PX = DESIGN_DPI / 25.4;
const CANVAS_W = Math.round(PAGE_W_MM * MM_TO_PX);
const CANVAS_H = Math.round(PAGE_H_MM * MM_TO_PX);

function mm(value: number): string {
  return `${value}mm`;
}

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
    <svg width="100%" height="100%" viewBox="0 0 ${PAGE_W_MM} ${PAGE_H_MM}"
         preserveAspectRatio="none" style="position:absolute;inset:0;"
         xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="geo" width="12" height="12" patternUnits="userSpaceOnUse"
                 patternTransform="rotate(45)">
          <path d="M6 0 L12 6 L6 12 L0 6 Z"
                fill="none" stroke="${COLORS.medGreen}" stroke-width="0.18" opacity="0.05"/>
          <circle cx="6" cy="6" r="1.2" fill="none"
                  stroke="${COLORS.gold}" stroke-width="0.16" opacity="0.06"/>
        </pattern>
      </defs>
      <rect width="${PAGE_W_MM}" height="${PAGE_H_MM}" fill="url(#geo)"/>
      <path d="M0 151 Q54 130 113 155 T15 210 Z"
            fill="${COLORS.medGreen}" opacity="0.035"/>
      <path d="M297 38 Q244 59 208 21 T297 0 Z"
            fill="${COLORS.gold}" opacity="0.05"/>
    </svg>
  `;
}

/** زاوية زخرفية بسيطة (ربع دائرة + نقطة) بأربع اتجاهات */
function buildCorner(pos: 'tl' | 'tr' | 'bl' | 'br'): string {
  const map: Record<string, string> = {
    tl: 'top:11mm;left:11mm;transform:rotate(0deg);',
    tr: 'top:11mm;right:11mm;transform:scaleX(-1);',
    bl: 'bottom:11mm;left:11mm;transform:scaleY(-1);',
    br: 'bottom:11mm;right:11mm;transform:scale(-1,-1);',
  };

  return `
    <svg width="22mm" height="22mm" viewBox="0 0 22 22"
         style="position:absolute;${map[pos]}opacity:.72"
         xmlns="http://www.w3.org/2000/svg">
      <path d="M1 14 Q1 1 14 1" fill="none"
            stroke="${COLORS.gold}" stroke-width="0.75"/>
      <path d="M1 18 Q1 5 18 1" fill="none"
            stroke="${COLORS.gold}" stroke-width="0.35" opacity=".7"/>
      <circle cx="14" cy="1" r="1.05" fill="${COLORS.gold}"/>
      <path d="M4 14 L8 10 L12 14 L8 18 Z" fill="none"
            stroke="${COLORS.medGreen}" stroke-width="0.35" opacity=".55"/>
    </svg>
  `;
}

function buildInfoBadge(label: string, value: string): string {
  return `
    <div style="width:65mm;min-height:20mm;box-sizing:border-box;text-align:center;
                padding:2mm 3mm;border-bottom:0.35mm solid ${COLORS.gold};">
      <div style="color:${COLORS.grayText};font-size:4.2mm;font-weight:700;">${label}</div>
      <div style="color:${COLORS.darkGreen};font-size:5.6mm;font-weight:700;
                  margin-top:1.5mm;white-space:nowrap;overflow:hidden;
                  text-overflow:ellipsis;">${value}</div>
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
    ? `<img src="${assets.signatureUrl}" style="width:45mm;height:13mm;object-fit:contain;margin-bottom:1mm;" />`
    : `<div style="width:45mm;height:13mm;"></div>`;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-99999px';
  container.style.width = mm(PAGE_W_MM);
  container.style.height = mm(PAGE_H_MM);
  container.style.boxSizing = 'border-box';
  container.dir = 'rtl';
  container.style.fontFamily = "'Cairo', system-ui, sans-serif";
  container.style.background = COLORS.ivory;

  container.innerHTML = `
    <div style="width:${mm(PAGE_W_MM)};height:${mm(PAGE_H_MM)};box-sizing:border-box;
                position:relative;background:${COLORS.ivory};overflow:hidden;
                direction:rtl;color:${COLORS.darkGreen};">

      ${buildBackgroundLayer()}

      <div style="position:absolute;inset:5mm;border:0.7mm solid ${COLORS.gold};
                  pointer-events:none;box-sizing:border-box;"></div>
      <div style="position:absolute;inset:8mm;border:0.35mm solid ${COLORS.gold};
                  pointer-events:none;box-sizing:border-box;"></div>

      ${buildCorner('tl')}${buildCorner('tr')}${buildCorner('bl')}${buildCorner('br')}

      <!-- الشعار: أقصى 42×22mm، أعلى الوسط -->
      <div style="position:absolute;top:13mm;left:50%;transform:translateX(-50%);
                  width:42mm;height:22mm;display:flex;flex-direction:column;
                  align-items:center;justify-content:flex-start;box-sizing:border-box;">
        <img src="${logoSrc}" style="max-width:42mm;max-height:16mm;width:auto;height:auto;
                  object-fit:contain;display:block;" />
        <div style="color:${COLORS.darkGreen};font-size:7mm;font-weight:700;
                    line-height:1;margin-top:2mm;white-space:nowrap;">${escapeHtml(appName)}</div>
      </div>

      <!-- عنوان الشهادة: يبدأ تقريبًا عند 43mm -->
      <div style="position:absolute;top:43mm;left:50%;transform:translateX(-50%);
                  width:150mm;height:18mm;display:flex;flex-direction:column;
                  align-items:center;justify-content:flex-start;box-sizing:border-box;">
        <div style="color:${COLORS.darkGreen};font-size:14mm;font-weight:700;
                    line-height:1.15;white-space:nowrap;">شهادة إنجاز</div>
        <div style="width:40mm;height:0.45mm;background:${COLORS.gold};margin-top:2.5mm;"></div>
      </div>

      <!-- النص التمهيدي -->
      <div style="position:absolute;top:67mm;left:50%;transform:translateX(-50%);
                  width:180mm;height:10mm;text-align:center;color:${COLORS.grayText};
                  font-size:5.5mm;line-height:1.5;box-sizing:border-box;">
        تشهد منصة ${escapeHtml(appName)} بأن
      </div>

      <!-- اسم الطالب -->
      <div style="position:absolute;top:78mm;left:50%;transform:translateX(-50%);
                  width:220mm;height:25mm;display:flex;align-items:center;
                  justify-content:center;box-sizing:border-box;overflow:hidden;">
        <div id="student-name"
             style="color:${COLORS.darkGreen};font-size:14mm;font-weight:700;
                    line-height:1.05;white-space:nowrap;text-align:center;max-width:220mm;">
          ${escapeHtml(cert.studentName)}
        </div>
      </div>
      <div style="position:absolute;top:104mm;left:50%;transform:translateX(-50%);
                  width:100mm;height:0.45mm;
                  background:linear-gradient(90deg,transparent,${COLORS.gold},transparent);"></div>

      <!-- وصف الإنجاز -->
      <div style="position:absolute;top:108mm;left:50%;transform:translateX(-50%);
                  width:220mm;height:20mm;text-align:center;box-sizing:border-box;
                  color:${COLORS.grayText};font-size:6mm;line-height:1.5;">
        <div>قد أتم برنامج</div>
        <div style="color:${COLORS.darkGreen};font-size:7mm;font-weight:700;
                    margin-top:1.5mm;white-space:nowrap;overflow:hidden;
                    text-overflow:ellipsis;">
          ${escapeHtml(cert.cycleName)}
        </div>
      </div>

      <!-- بيانات الإنجاز: 3 أعمدة × 65mm -->
      <div style="position:absolute;top:132mm;left:50%;transform:translateX(-50%);
                  width:211mm;height:30mm;display:flex;justify-content:center;gap:9mm;
                  box-sizing:border-box;">
        ${buildInfoBadge('نسبة الإنجاز', `${cert.progressPercent}%`)}
        ${buildInfoBadge('رقم الشهادة', escapeHtml(cert.certificateNumber))}
        ${buildInfoBadge('تاريخ الإصدار', escapeHtml(cert.issueDate))}
      </div>

      <!-- العبارة الختامية الدعائية -->
      <div style="position:absolute;top:163mm;left:50%;transform:translateX(-50%);
                  width:220mm;height:12mm;text-align:center;color:${COLORS.grayText};
                  font-size:4.8mm;line-height:1.6;box-sizing:border-box;overflow:hidden;">
        ${escapeHtml(getDuaText(cert.studentGender))}
      </div>

      <!-- المنطقة السفلية: التوقيع وQR -->
      <div style="position:absolute;top:165mm;left:12mm;right:12mm;height:35mm;
                  box-sizing:border-box;display:flex;align-items:flex-end;
                  justify-content:space-between;direction:ltr;">

        <div style="width:45mm;height:25mm;text-align:center;direction:rtl;box-sizing:border-box;">
          <div style="color:${COLORS.grayText};font-size:4mm;margin-bottom:1mm;">التوقيع</div>
          ${signatureBlock}
          <div style="width:45mm;border-top:0.3mm solid ${COLORS.grayText};
                      padding-top:1mm;font-size:4.2mm;color:${COLORS.darkGreen};
                      font-weight:700;box-sizing:border-box;">${escapeHtml(appName)}</div>
        </div>

        <div style="width:45mm;height:25mm;text-align:center;direction:rtl;
                    box-sizing:border-box;display:flex;flex-direction:column;
                    align-items:center;justify-content:flex-end;">
          ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:22mm;height:22mm;display:block;" />` : ''}
          <div style="font-size:3.2mm;color:${COLORS.grayText};margin-top:0.8mm;line-height:1;">
            تحقق من صحة الشهادة
          </div>
          <div style="font-size:3.8mm;color:${COLORS.darkGreen};margin-top:0.8mm;white-space:nowrap;">
            رقم الشهادة: ${escapeHtml(cert.certificateNumber)}
          </div>
        </div>
      </div>

      <!-- عبارة ختامية في أسفل الوسط -->
      <div style="position:absolute;bottom:6mm;left:50%;transform:translateX(-50%);
                  width:130mm;height:8mm;text-align:center;color:${COLORS.grayText};
                  font-size:5mm;line-height:1.5;">
        نسأل الله أن يبارك في علمه وينفع به
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

    // Auto-fit لاسم الطالب ضمن مساحة 220mm × 25mm.
    const studentNameEl = container.querySelector<HTMLElement>('#student-name');
    if (studentNameEl) {
      let fontSize = 15;
      const minFont = 8;
      studentNameEl.style.fontSize = `${fontSize}mm`;

      while (
        fontSize > minFont &&
        (studentNameEl.scrollWidth > studentNameEl.clientWidth ||
         studentNameEl.scrollHeight > studentNameEl.clientHeight)
      ) {
        fontSize -= 0.5;
        studentNameEl.style.fontSize = `${fontSize}mm`;
      }
    }

    const canvas = await html2canvas(container, {
      scale: 3,
      backgroundColor: COLORS.ivory,
      useCORS: true,
      width: CANVAS_W,
      height: CANVAS_H,
      windowWidth: CANVAS_W,
      windowHeight: CANVAS_H,
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
