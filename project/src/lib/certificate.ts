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
        <pattern id="geoFine" width="6" height="6" patternUnits="userSpaceOnUse"
                 patternTransform="rotate(45)">
          <path d="M3 0 L6 3 L3 6 L0 3 Z"
                fill="none" stroke="${COLORS.gold}" stroke-width="0.1" opacity="0.04"/>
        </pattern>
      </defs>
      <rect width="${PAGE_W_MM}" height="${PAGE_H_MM}" fill="url(#geo)"/>
      <rect width="${PAGE_W_MM}" height="${PAGE_H_MM}" fill="url(#geoFine)"/>
      <path d="M0 151 Q54 130 113 155 T15 210 Z"
            fill="${COLORS.medGreen}" opacity="0.035"/>
      <path d="M297 38 Q244 59 208 21 T297 0 Z"
            fill="${COLORS.gold}" opacity="0.05"/>
      <!-- شمسية إسلامية شفافة خلف عنوان الشهادة -->
      <g transform="translate(148.5,32)" opacity="0.06">
        <circle r="16" fill="none" stroke="${COLORS.gold}" stroke-width="0.4"/>
        <circle r="12.5" fill="none" stroke="${COLORS.gold}" stroke-width="0.25"/>
      </g>
    </svg>
  `;
}

/** نجمة إسلامية ثمانية (رُبع الحزب) بسيطة نستخدمها كعنصر زخرفي مركزي */
function buildEightPointStar(size: number, color: string, opacity = 1): string {
  const s = size;
  const c = s / 2;
  return `
    <svg width="${s}mm" height="${s}mm" viewBox="0 0 ${s} ${s}"
         style="display:block;" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(${c},${c})" opacity="${opacity}">
        <rect x="${-c * 0.62}" y="${-c * 0.62}" width="${c * 1.24}" height="${c * 1.24}"
              transform="rotate(0)" fill="none" stroke="${color}" stroke-width="${s * 0.035}"/>
        <rect x="${-c * 0.62}" y="${-c * 0.62}" width="${c * 1.24}" height="${c * 1.24}"
              transform="rotate(45)" fill="none" stroke="${color}" stroke-width="${s * 0.035}"/>
      </g>
    </svg>
  `;
}

/** شريط زخرفي (زهرة/نجمة + خطان متدرجان) يوضع أسفل عنوان الشهادة مباشرة.
 *  نتجنّب display:flex عمدًا (انظر ملاحظة html2canvas أعلى قسم اسم الطالب)
 *  ونستخدم بدلاً منه عناصر inline-block بعرض ثابت لضمان رسم موثوق. */
function buildTitleFlourish(): string {
  return `
    <div style="text-align:center;white-space:nowrap;margin-top:4mm;line-height:0;">
      <span style="display:inline-block;vertical-align:middle;width:34mm;height:0.4mm;
                   background:linear-gradient(90deg,transparent,${COLORS.gold});"></span>
      <span style="display:inline-block;vertical-align:middle;margin:0 3mm;">${buildEightPointStar(6.5, COLORS.gold, 0.9)}</span>
      <span style="display:inline-block;vertical-align:middle;width:34mm;height:0.4mm;
                   background:linear-gradient(270deg,transparent,${COLORS.gold});"></span>
    </div>
  `;
}

/** زاوية زخرفية إسلامية أكثر ثراءً بأربع اتجاهات داخل الإطار بأمان */
function buildCorner(pos: 'tl' | 'tr' | 'bl' | 'br'): string {
  const map: Record<string, string> = {
    tl: 'top:9.5mm;left:9.5mm;transform:rotate(0deg);',
    tr: 'top:9.5mm;right:9.5mm;transform:scaleX(-1);',
    bl: 'bottom:9.5mm;left:9.5mm;transform:scaleY(-1);',
    br: 'bottom:9.5mm;right:9.5mm;transform:scale(-1,-1);',
  };

  return `
    <svg width="24mm" height="24mm" viewBox="0 0 26 26"
         style="position:absolute;${map[pos]}opacity:.8;pointer-events:none;"
         xmlns="http://www.w3.org/2000/svg">
      <path d="M1 16 Q1 1 16 1" fill="none"
            stroke="${COLORS.gold}" stroke-width="0.75"/>
      <path d="M1 21 Q1 6 21 1" fill="none"
            stroke="${COLORS.gold}" stroke-width="0.32" opacity=".7"/>
      <path d="M1 12 Q1 1 12 1" fill="none"
            stroke="${COLORS.medGreen}" stroke-width="0.3" opacity=".5"/>
      <circle cx="16" cy="1" r="1.1" fill="${COLORS.gold}"/>
      <circle cx="1" cy="16" r="1.1" fill="${COLORS.gold}"/>
      <path d="M4.5 15.5 L8.5 11.5 L12.5 15.5 L8.5 19.5 Z" fill="none"
            stroke="${COLORS.medGreen}" stroke-width="0.35" opacity=".6"/>
      <circle cx="8.5" cy="15.5" r="1.5" fill="none" stroke="${COLORS.gold}" stroke-width="0.3" opacity=".7"/>
      <path d="M6 8 Q8.5 5 11 8" fill="none" stroke="${COLORS.gold}" stroke-width="0.3" opacity=".55"/>
    </svg>
  `;
}

/** إطار زخرفي بنقش هندسي متكرر بين الحدين الذهبيين (بدلاً من خط فارغ) */
function buildOrnateFrame(): string {
  const w = PAGE_W_MM;
  const h = PAGE_H_MM;
  const inset = 6.5;
  const x = inset, y = inset;
  const rw = w - inset * 2, rh = h - inset * 2;
  return `
    <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}"
         preserveAspectRatio="none" style="position:absolute;inset:0;pointer-events:none;"
         xmlns="http://www.w3.org/2000/svg">
      <rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="none"
            stroke="${COLORS.gold}" stroke-width="0.22"
            stroke-dasharray="1.4 2.1" opacity="0.85"/>
    </svg>
  `;
}

function buildInfoBadge(label: string, value: string): string {
  return `
    <div style="width:65mm;min-height:20mm;box-sizing:border-box;text-align:center;
                padding:2mm 3mm;border-bottom:0.35mm solid ${COLORS.gold};position:relative;">
      <div style="color:${COLORS.grayText};font-size:4.2mm;font-weight:700;">${label}</div>
      <div style="color:${COLORS.darkGreen};font-size:5.6mm;font-weight:700;
                  margin-top:1.5mm;white-space:nowrap;overflow:hidden;
                  text-overflow:ellipsis;" dir="auto">${value}</div>
      <div style="position:absolute;bottom:-1.1mm;left:50%;transform:translateX(-50%);
                  width:1.6mm;height:1.6mm;background:${COLORS.gold};
                  border-radius:50%;"></div>
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

      <!-- الإطار المزدوج + نقش زخرفي بينهما -->
      <div style="position:absolute;inset:5mm;border:0.8mm solid ${COLORS.gold};
                  box-sizing:border-box;pointer-events:none;"></div>
      ${buildOrnateFrame()}
      <div style="position:absolute;inset:8mm;border:0.32mm solid ${COLORS.gold};
                  box-sizing:border-box;pointer-events:none;"></div>

      ${buildCorner('tl')}${buildCorner('tr')}${buildCorner('bl')}${buildCorner('br')}

      <!-- البسملة -->
      <div style="position:absolute;top:10.5mm;left:50%;transform:translateX(-50%);
                  width:150mm;text-align:center;color:${COLORS.gold};
                  font-family:'Amiri', 'Cairo', serif;font-size:5mm;font-weight:700;
                  letter-spacing:0.3mm;white-space:nowrap;z-index:2;">
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
      </div>

      <!-- الشعار: أعلى الصفحة جهة اليسار -->
      <div style="position:absolute;top:17mm;left:12mm;width:52mm;height:28mm;
                  display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
                  box-sizing:border-box;direction:rtl;z-index:3;">
        <img src="${logoSrc}" alt="شعار ${escapeHtml(appName)}"
             style="max-width:50mm;max-height:20mm;width:auto;height:auto;object-fit:contain;
                    display:block;" />
        <div style="color:${COLORS.darkGreen};font-size:5.6mm;font-weight:700;line-height:1;
                    margin-top:2mm;white-space:nowrap;">${escapeHtml(appName)}</div>
      </div>

      <!-- عنوان الشهادة: وسط الصفحة -->
      <div style="position:absolute;top:24mm;left:50%;transform:translateX(-50%);
                  width:180mm;display:flex;flex-direction:column;align-items:center;
                  justify-content:flex-start;box-sizing:border-box;">
        <div style="color:${COLORS.darkGreen};font-family:'Amiri','Cairo',serif;
                    font-size:15mm;font-weight:700;line-height:1.1;white-space:nowrap;
                    text-shadow:0 0.4mm 0 ${COLORS.lightGold}22;">شهادة إنجاز</div>
        ${buildTitleFlourish()}
      </div>

      <!-- النص التمهيدي -->
      <div style="position:absolute;top:65mm;left:50%;transform:translateX(-50%);
                  width:180mm;height:9mm;text-align:center;color:${COLORS.grayText};
                  font-size:5.5mm;line-height:1.5;box-sizing:border-box;">
        تشهد منصة ${escapeHtml(appName)} بأن
      </div>

      <!-- اسم الطالب -->
      <!-- ملاحظة مهمة: تعمّدنا تجنّب display:flex هنا. مكتبة html2canvas معروفة
           بضعف دعمها لـ flexbox مع النص العربي (RTL)، وقد يتسبب هذا الجمع في
           قصّ النص ورسم جزء صغير منه فقط (مثل ظهور حرفين فقط من الاسم). لذلك
           نعتمد نفس أسلوب التوسيط بـ text-align المستخدم بنجاح في بقية عناصر
           الشهادة (وصف الإنجاز، الدعاء، ...) بدلاً من flex. -->
      <div id="student-name-wrap" style="position:absolute;top:74mm;left:50%;transform:translateX(-50%);
                  width:230mm;height:28mm;box-sizing:border-box;overflow:hidden;text-align:center;">
        <div id="student-name" style="color:${COLORS.darkGreen};font-size:15mm;font-weight:700;
                    line-height:1.2;white-space:normal;word-break:normal;overflow-wrap:break-word;
                    text-align:center;width:225mm;max-width:225mm;margin:2mm auto 0 auto;
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
      <div style="position:absolute;top:159mm;left:50%;transform:translateX(-50%);
                  width:220mm;height:11mm;text-align:center;color:${COLORS.grayText};
                  font-size:5.2mm;line-height:1.55;box-sizing:border-box;overflow:hidden;">
        ${escapeHtml(getDuaText(cert.studentGender))}
      </div>

      <!-- المنطقة السفلية: التوقيع يمينًا، والـQR والختم يسارًا -->
      <div style="position:absolute;top:175mm;left:12mm;right:12mm;height:25mm;
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
        <div style="width:58mm;height:26mm;display:flex;align-items:center;justify-content:center;
                    direction:rtl;box-sizing:border-box;gap:4mm;">
          <div style="width:25mm;height:25mm;border:0.3mm solid ${COLORS.gold};padding:1mm;
                      box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:#fff;">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:22mm;height:22mm;display:block;" />` : ''}
          </div>
          <div style="width:28mm;text-align:right;box-sizing:border-box;">
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

    // Auto-fit لاسم الطالب ضمن صندوق ثابت الحجم (230mm × 27mm، overflow:hidden).
    // المقياس الصحيح هو صندوق الالتفاف الخارجي الثابت الحجم وليس العنصر الداخلي
    // نفسه (الذي يتمدد تلقائيًا مع محتواه ولذلك لا يكشف الفائض أبدًا).
    const wrapEl = container.querySelector<HTMLElement>('#student-name-wrap');
    const studentNameEl = container.querySelector<HTMLElement>('#student-name');
    if (wrapEl && studentNameEl) {
      let fontSize = 15;
      const minFont = 6;
      studentNameEl.style.fontSize = `${fontSize}mm`;

      while (fontSize > minFont) {
        const overflowing = wrapEl.scrollHeight > wrapEl.clientHeight + 1
          || wrapEl.scrollWidth > wrapEl.clientWidth + 1;
        if (!overflowing) break;
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
}
