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
 * واتجاه RTL بشكل تلقائي)، ثم نحوّله إلى صورة عالية الدقة عبر html2canvas،
 * ونضعها كصفحة واحدة داخل PDF بمقاس A4 Landscape حقيقي (297×210mm).
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

function mm(value: number): string {
  return `${value}mm`;
}

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

/** تنظيف تنسيق التاريخ ليظهر بشكل نظيف */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

/** نص الدعاء أسفل الشهادة — يتغيّر الضمير تلقائيًا حسب جنس الطالب */
function getDuaText(gender?: 'male' | 'female'): string {
  if (gender === 'male') {
    return 'نسأل الله له دوام التوفيق والسداد، وأن يجعل ما تعلّمه في ميزان حسناته، ويبارك في جهده وعلمه.';
  }
  if (gender === 'female') {
    return 'نسأل الله لها دوام التوفيق والسداد، وأن يجعل ما تعلّمته في ميزان حسناتها، ويبارك في جهدها وعلمها.';
  }
  return 'نسأل الله له / لها دوام التوفيق والسداد، وأن يجعل ما تعلّمه في ميزان حسناته، ويبارك في جهده وعلمه.';
}

/** خلفية زخرفية خفيفة: نقش هندسي إسلامي متكرر (SVG pattern) بشفافية منخفضة */
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

/** زاوية زخرفية بأربع اتجاهات داخل الإطار بأمان */
function buildCorner(pos: 'tl' | 'tr' | 'bl' | 'br'): string {
  const map: Record<string, string> = {
    tl: 'top:10mm;left:10mm;transform:rotate(0deg);',
    tr: 'top:10mm;right:10mm;transform:scaleX(-1);',
    bl: 'bottom:10mm;left:10mm;transform:scaleY(-1);',
    br: 'bottom:10mm;right:10mm;transform:scale(-1,-1);',
  };

  return `
    <svg width="20mm" height="20mm" viewBox="0 0 22 22"
         style="position:absolute;${map[pos]}opacity:.72;pointer-events:none;"
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
                  text-overflow:ellipsis;" dir="auto">${value}</div>
    </div>
  `;
}

interface CertificateAssets {
  logoUrl?: string;
  signatureUrl?: string;
  appName?: string;
}

export async function generateCertificatePDF(cert: Certificate, assets: CertificateAssets = {}): Promise<void> {
  const appName = assets.appName || 'زاد الحلقات';
  const logoSrc = assets.logoUrl && assets.logoUrl.trim() ? assets.logoUrl : '/logo.png';
  const issueDateFormatted = formatDate(cert.issueDate);

  const qrPayload = JSON.stringify({
    id: cert.id,
    num: cert.certificateNumber,
    student: cert.studentName,
    date: issueDateFormatted,
  });
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 220, margin: 1, color: { dark: COLORS.darkGreen, light: '#00000000' } });
  } catch {
    // فشل توليد QR لا يمنع إصدار الشهادة
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
  container.style.overflow = 'hidden';
  container.dir = 'rtl';
  container.style.fontFamily = "'Cairo', system-ui, sans-serif";
  container.style.background = COLORS.ivory;

  container.innerHTML = `
    <div style="width:297mm;height:210mm;box-sizing:border-box;position:relative;
                background:${COLORS.ivory};overflow:hidden;direction:rtl;color:${COLORS.darkGreen};">

      ${buildBackgroundLayer()}

      <!-- الإطار المزدوج -->
      <div style="position:absolute;inset:5mm;border:0.7mm solid ${COLORS.gold};
                  box-sizing:border-box;pointer-events:none;"></div>
      <div style="position:absolute;inset:8mm;border:0.35mm solid ${COLORS.gold};
                  box-sizing:border-box;pointer-events:none;"></div>

      ${buildCorner('tl')}${buildCorner('tr')}${buildCorner('bl')}${buildCorner('br')}

      <!-- الشعار: أعلى الصفحة جهة اليسار -->
      <div style="position:absolute;top:11mm;left:12mm;width:52mm;height:30mm;
                  display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
                  box-sizing:border-box;direction:rtl;z-index:3;">
        <img src="${logoSrc}" alt="شعار ${escapeHtml(appName)}"
             style="max-width:52mm;max-height:22mm;width:auto;height:auto;object-fit:contain;
                    display:block;" />
        <div style="color:${COLORS.darkGreen};font-size:6mm;font-weight:700;line-height:1;
                    margin-top:2mm;white-space:nowrap;">${escapeHtml(appName)}</div>
      </div>

      <!-- عنوان الشهادة: وسط الصفحة -->
      <div style="position:absolute;top:42mm;left:50%;transform:translateX(-50%);
                  width:150mm;height:22mm;display:flex;flex-direction:column;align-items:center;
                  justify-content:flex-start;box-sizing:border-box;">
        <div style="color:${COLORS.darkGreen};font-size:14mm;font-weight:700;
                    line-height:1.1;white-space:nowrap;">شهادة إنجاز</div>
        <div style="width:48mm;height:0.5mm;background:${COLORS.gold};margin-top:5mm;"></div>
      </div>

      <!-- النص التمهيدي -->
      <div style="position:absolute;top:68mm;left:50%;transform:translateX(-50%);
                  width:180mm;height:9mm;text-align:center;color:${COLORS.grayText};
                  font-size:5.5mm;line-height:1.5;box-sizing:border-box;">
        تشهد منصة ${escapeHtml(appName)} بأن
      </div>

      <!-- اسم الطالب -->
      <div style="position:absolute;top:78mm;left:50%;transform:translateX(-50%);
                  width:220mm;height:25mm;display:flex;align-items:center;justify-content:center;
                  box-sizing:border-box;overflow:hidden;">
        <div id="student-name" style="color:${COLORS.darkGreen};font-size:15mm;font-weight:700;
                    line-height:1.15;white-space:normal;word-break:keep-all;overflow-wrap:normal;
                    text-align:center;width:220mm;max-width:220mm;min-height:18mm;
                    padding:0 2mm;box-sizing:border-box;">
          ${escapeHtml(cert.studentName)}
        </div>
      </div>
      <div style="position:absolute;top:104mm;left:50%;transform:translateX(-50%);
                  width:105mm;height:0.45mm;background:linear-gradient(90deg,transparent,
                  ${COLORS.gold},transparent);"></div>

      <!-- وصف الإنجاز -->
      <div style="position:absolute;top:108mm;left:50%;transform:translateX(-50%);
                  width:220mm;height:21mm;text-align:center;box-sizing:border-box;
                  color:${COLORS.grayText};font-size:5.8mm;line-height:1.45;">
        <div>قد أتم برنامج</div>
        <div style="color:${COLORS.darkGreen};font-size:7mm;font-weight:700;margin-top:1.5mm;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" dir="auto">
          ${escapeHtml(cert.cycleName)}
        </div>
      </div>

      <!-- بيانات الإنجاز الثلاثة -->
      <div style="position:absolute;top:133mm;left:50%;transform:translateX(-50%);
                  width:211mm;height:27mm;display:flex;justify-content:center;gap:8mm;
                  box-sizing:border-box;direction:rtl;">
        ${buildInfoBadge('نسبة الإنجاز', `${cert.progressPercent}%`)}
        ${buildInfoBadge('رقم الشهادة', escapeHtml(cert.certificateNumber))}
        ${buildInfoBadge('تاريخ الإصدار', escapeHtml(issueDateFormatted))}
      </div>

      <!-- دعاء قصير -->
      <div style="position:absolute;top:158mm;left:50%;transform:translateX(-50%);
                  width:220mm;height:11mm;text-align:center;color:${COLORS.grayText};
                  font-size:5.2mm;line-height:1.55;box-sizing:border-box;overflow:hidden;">
        ${escapeHtml(getDuaText(cert.studentGender))}
      </div>

      <!-- المنطقة السفلية: التوقيع يمينًا، والـQR والختم يسارًا -->
      <div style="position:absolute;top:174mm;left:12mm;right:12mm;height:25mm;
                  box-sizing:border-box;display:flex;align-items:flex-end;
                  justify-content:space-between;direction:rtl;">

        <!-- التوقيع (جهة اليمين في العربية) -->
        <div style="width:55mm;height:26mm;text-align:center;direction:rtl;box-sizing:border-box;">
          <div style="color:${COLORS.grayText};font-size:3.8mm;margin-bottom:0.5mm;">التوقيع</div>
          ${signatureBlock}
          <div style="width:45mm;margin:0 auto;border-top:0.3mm solid ${COLORS.grayText};
                      padding-top:0.8mm;font-size:4mm;color:${COLORS.darkGreen};
                      font-weight:700;box-sizing:border-box;">${escapeHtml(appName)}</div>
        </div>

        <!-- الـ QR (جهة اليسار في العربية) -->
        <div style="width:55mm;height:26mm;display:flex;align-items:center;justify-content:center;
                    direction:rtl;box-sizing:border-box;gap:4mm;">
          <div style="width:25mm;height:25mm;border:0.3mm solid ${COLORS.gold};padding:1mm;
                      box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:#fff;">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:22mm;height:22mm;display:block;" />` : ''}
          </div>
          <div style="width:26mm;text-align:right;box-sizing:border-box;">
            <div style="font-size:3.3mm;color:${COLORS.grayText};line-height:1.5;">تحقق من صحة الشهادة</div>
            <div style="font-size:3.8mm;color:${COLORS.darkGreen};font-weight:700;
                        margin-top:1mm;line-height:1.4;word-break:break-word;" dir="ltr">
              ${escapeHtml(cert.certificateNumber)}
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    if ('fonts' in document) {
      await document.fonts.ready;
    }

    // Auto-fit لاسم الطالب ضمن مساحة 220mm × 25mm.
    const studentNameEl = container.querySelector<HTMLElement>('#student-name');
    if (studentNameEl) {
      let fontSize = 15;
      const minFont = 7;
      studentNameEl.style.fontSize = `${fontSize}mm`;

      while (fontSize > minFont) {
        const fitsWidth = studentNameEl.scrollWidth <= studentNameEl.clientWidth + 2;
        const fitsHeight = studentNameEl.scrollHeight <= studentNameEl.clientHeight + 2;
        if (fitsWidth && fitsHeight) break;
        fontSize -= 0.5;
        studentNameEl.style.fontSize = `${fontSize}mm`;
      }
    }

    const canvas = await html2canvas(container, {
      scale: 3,
      backgroundColor: COLORS.ivory,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
    pdf.save(`certificate-${cert.certificateNumber}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}// ... (الأجزاء السابقة كما هي)

      <!-- المنطقة السفلية: التوقيع يمينًا، والـQR والختم يسارًا -->
      <div style="position:absolute;top:174mm;left:12mm;right:12mm;height:25mm;
                  box-sizing:border-box;display:flex;align-items:flex-end;
                  justify-content:space-between;direction:ltr;">

        <!-- التوقيع (يظهر في الجهة اليمنى من الشهادة) -->
        <div style="width:55mm;height:26mm;text-align:center;direction:rtl;box-sizing:border-box;order:2;">
          <div style="color:${COLORS.grayText};font-size:3.8mm;margin-bottom:0.5mm;">التوقيع</div>
          ${signatureBlock}
          <div style="width:45mm;margin:0 auto;border-top:0.3mm solid ${COLORS.grayText};
                      padding-top:0.8mm;font-size:4mm;color:${COLORS.darkGreen};
                      font-weight:700;box-sizing:border-box;">${escapeHtml(appName)}</div>
        </div>

        <!-- الـ QR (يظهر في الجهة اليسرى من الشهادة) -->
        <div style="width:55mm;height:26mm;display:flex;align-items:center;justify-content:center;
                    direction:rtl;box-sizing:border-box;gap:4mm;order:1;">
          <div style="width:25mm;height:25mm;border:0.3mm solid ${COLORS.gold};padding:1mm;
                      box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:#fff;">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:22mm;height:22mm;display:block;" />` : ''}
          </div>
          <div style="width:26mm;text-align:right;box-sizing:border-box;">
            <div style="font-size:3.3mm;color:${COLORS.grayText};line-height:1.5;">تحقق من صحة الشهادة</div>
            <div style="font-size:3.8mm;color:${COLORS.darkGreen};font-weight:700;
                        margin-top:1mm;line-height:1.4;word-break:break-word;" dir="ltr">
              ${escapeHtml(cert.certificateNumber)}
            </div>
          </div>
        </div>
      </div>

// ... (بقية الكود)
