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

// شكل الإطار الزخرفي: لوحة بزوايا مستديرة كبيرة، وزوايا خضراء زخرفية
// بنفس انحناء الإطار الذهبي (تصميم مستوحى من الشهادات التقليدية).
const PLAQUE_RADIUS_MM = 26; // انحناء زوايا اللوحة الخارجية
const CORNER_SIZE_MM = 40;   // حجم كل زاوية خضراء زخرفية

function mm(value: number): string {
  return `${value}mm`;
}

/**
 * توسيط أفقي بإزاحة `left` صريحة بدل `left:50%; transform:translateX(-50%)`.
 * html2canvas يحسب مستطيل القص الخاص بـ overflow:hidden دون تطبيق translateX،
 * فيبدأ القص من منتصف الصفحة ويُخفي النصف الأيسر من أي نص متوسّط — وهذا كان سبب
 * ظهور "أحمد" كـ "أح" وقص الأسماء الطويلة في PDF (بينما تبدو سليمة في المتصفح).
 */
function leftFor(widthMm: number): string {
  return `left:${(PAGE_W_MM - widthMm) / 2}mm;`;
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

/** نقش هندسي إسلامي خفيف يُملأ داخل الزوايا الخضراء (نجمة ثمانية بخطوط ذهبية) */
function buildCornerPattern(patternId: string): string {
  return `
    <pattern id="${patternId}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path d="M4 0 L8 4 L4 8 L0 4 Z" fill="none" stroke="${COLORS.gold}" stroke-width="0.22" opacity="0.6"/>
      <circle cx="4" cy="4" r="0.8" fill="none" stroke="${COLORS.gold}" stroke-width="0.16" opacity="0.55"/>
    </pattern>
  `;
}

/**
 * زاوية زخرفية خضراء مصمتة بشكل "ربع دائرة" ينحني نحو مركز الشهادة،
 * وحافتها الخارجية تتبع نفس انحناء إطار اللوحة الذهبي بحيث تندمج معه.
 */
function buildCorner(pos: 'tl' | 'tr' | 'bl' | 'br'): string {
  const cfg: Record<'tl' | 'tr' | 'bl' | 'br', { box: string; radius: string }> = {
    tl: { box: 'top:5mm;left:5mm;', radius: `${PLAQUE_RADIUS_MM}mm 0 ${CORNER_SIZE_MM}mm 0` },
    tr: { box: 'top:5mm;right:5mm;', radius: `0 ${PLAQUE_RADIUS_MM}mm 0 ${CORNER_SIZE_MM}mm` },
    bl: { box: 'bottom:5mm;left:5mm;', radius: `0 ${CORNER_SIZE_MM}mm 0 ${PLAQUE_RADIUS_MM}mm` },
    br: { box: 'bottom:5mm;right:5mm;', radius: `${CORNER_SIZE_MM}mm 0 ${PLAQUE_RADIUS_MM}mm 0` },
  };
  const { box, radius } = cfg[pos];
  const patternId = `corner-pattern-${pos}`;

  return `
    <div style="position:absolute;${box}width:${CORNER_SIZE_MM}mm;height:${CORNER_SIZE_MM}mm;
                background:${COLORS.darkGreen};border-radius:${radius};
                overflow:hidden;box-sizing:border-box;z-index:1;">
      <svg width="100%" height="100%" viewBox="0 0 ${CORNER_SIZE_MM} ${CORNER_SIZE_MM}"
           xmlns="http://www.w3.org/2000/svg">
        <defs>${buildCornerPattern(patternId)}</defs>
        <rect width="${CORNER_SIZE_MM}" height="${CORNER_SIZE_MM}" fill="url(#${patternId})"/>
      </svg>
    </div>
  `;
}

function buildInfoBadge(label: string, value: string): string {
  return `
    <div style="width:55mm;min-height:20mm;box-sizing:border-box;text-align:center;
                padding:2mm 3mm;border-bottom:0.35mm solid ${COLORS.gold};">
      <div style="color:${COLORS.grayText};font-size:4.2mm;font-weight:700;">${label}</div>
      <div style="color:${COLORS.darkGreen};font-size:5.6mm;font-weight:700;
                  margin-top:1.5mm;white-space:nowrap;" dir="auto">${value}</div>
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

  // شهادة كتاب غير الكتاب الأساسي: «قد أتم حفظ <الكتاب> — <الدورة>»؛ غير ذلك يبقى النص القديم كما هو.
  const hasBook = !!cert.bookTitle && !!cert.bookId && cert.bookId !== 'book_default';
  const achievementTitle = hasBook ? `${cert.bookTitle} — ${cert.cycleName}` : cert.cycleName;

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
                background:${COLORS.ivory};overflow:hidden;direction:rtl;color:${COLORS.darkGreen};
                border-radius:${PLAQUE_RADIUS_MM}mm;">

      <!-- الإطار الذهبي المزدوج -->
      <div style="position:absolute;inset:5mm;border:0.8mm solid ${COLORS.gold};
                  border-radius:${PLAQUE_RADIUS_MM}mm;box-sizing:border-box;pointer-events:none;z-index:2;"></div>
      <div style="position:absolute;inset:7mm;border:0.35mm solid ${COLORS.gold};
                  border-radius:${PLAQUE_RADIUS_MM - 2}mm;box-sizing:border-box;pointer-events:none;z-index:2;"></div>

      ${buildCorner('tl')}${buildCorner('tr')}${buildCorner('bl')}${buildCorner('br')}

      <!-- الشعار: أعلى منتصف الصفحة، بعيدًا عن الزوايا الزخرفية -->
      <div style="position:absolute;top:9mm;${leftFor(70)}
                  width:70mm;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
                  box-sizing:border-box;z-index:3;">
        <img src="${logoSrc}" alt="شعار ${escapeHtml(appName)}"
             style="max-width:26mm;max-height:16mm;width:auto;height:auto;object-fit:contain;
                    display:block;" />
        <div style="color:${COLORS.darkGreen};font-size:5.4mm;font-weight:700;line-height:1;
                    margin-top:1.5mm;white-space:nowrap;">${escapeHtml(appName)}</div>
      </div>

      <!-- عنوان الشهادة: وسط الصفحة -->
      <div style="position:absolute;top:38mm;${leftFor(150)}
                  width:150mm;height:22mm;display:flex;flex-direction:column;align-items:center;
                  justify-content:flex-start;box-sizing:border-box;z-index:3;">
        <div style="color:${COLORS.darkGreen};font-size:14mm;font-weight:700;
                    line-height:1.1;white-space:nowrap;">شهادة إنجاز</div>
        <div style="width:48mm;height:0.5mm;background:${COLORS.gold};margin-top:8mm;"></div>
      </div>

      <!-- النص التمهيدي -->
      <div style="position:absolute;top:66mm;${leftFor(180)}
                  width:180mm;text-align:center;color:${COLORS.grayText};
                  font-size:5.5mm;line-height:1.5;box-sizing:border-box;z-index:3;">
        تشهد منصة ${escapeHtml(appName)} بأن
      </div>

      <!-- اسم الطالب: سطر واحد، والخط يتقلّص تلقائيًا ليتسع (بلا overflow:hidden) -->
      <div style="position:absolute;top:76mm;${leftFor(220)}
                  width:220mm;height:25mm;display:flex;align-items:center;justify-content:center;
                  box-sizing:border-box;z-index:3;">
        <div id="student-name" style="color:${COLORS.darkGreen};font-size:15mm;font-weight:700;
                    line-height:1.3;white-space:nowrap;text-align:center;width:220mm;
                    padding:0 2mm;box-sizing:border-box;">${escapeHtml(cert.studentName)}</div>
      </div>
      <div style="position:absolute;top:104mm;${leftFor(105)}
                  width:105mm;height:0.45mm;background:linear-gradient(90deg,transparent,
                  ${COLORS.gold},transparent);z-index:3;"></div>

      <!-- وصف الإنجاز -->
      <div style="position:absolute;top:108mm;${leftFor(220)}
                  width:220mm;text-align:center;box-sizing:border-box;
                  color:${COLORS.grayText};font-size:5.8mm;line-height:1.45;z-index:3;">
        <div>${hasBook ? 'قد أتم حفظ' : 'قد أتم برنامج'}</div>
        <div id="cycle-name" style="color:${COLORS.darkGreen};font-size:7mm;font-weight:700;margin-top:1.5mm;
                    line-height:1.5;white-space:nowrap;padding:0 2mm;box-sizing:border-box;" dir="auto">${escapeHtml(achievementTitle)}</div>
      </div>

      <!-- بيانات الإنجاز الثلاثة -->
      <div style="position:absolute;top:131mm;${leftFor(181)}
                  width:181mm;height:22mm;display:flex;justify-content:center;gap:8mm;
                  box-sizing:border-box;direction:rtl;z-index:3;">
        ${buildInfoBadge('نسبة الإنجاز', `${cert.progressPercent}%`)}
        ${buildInfoBadge('رقم الشهادة', escapeHtml(cert.certificateNumber))}
        ${buildInfoBadge('تاريخ الإصدار', escapeHtml(issueDateFormatted))}
      </div>

      <!-- دعاء قصير -->
      <div style="position:absolute;top:155mm;${leftFor(200)}
                  width:200mm;text-align:center;color:${COLORS.grayText};
                  font-size:5.2mm;line-height:1.55;box-sizing:border-box;z-index:3;">
        ${escapeHtml(getDuaText(cert.studentGender))}
      </div>

      <!-- المنطقة السفلية: التوقيع يمينًا، والـQR والختم يسارًا (بعيدًا عن الزوايا الزخرفية) -->
      <div style="position:absolute;top:172mm;left:48mm;right:48mm;height:26mm;
                  box-sizing:border-box;display:flex;align-items:flex-end;
                  justify-content:space-between;direction:rtl;z-index:3;">

        <!-- التوقيع (جهة اليمين في العربية) -->
        <div style="width:55mm;height:26mm;text-align:center;direction:rtl;box-sizing:border-box;">
          <div style="color:${COLORS.grayText};font-size:3.8mm;margin-bottom:0.5mm;">التوقيع</div>
          ${signatureBlock}
          <div style="width:45mm;margin:0 auto;border-top:0.3mm solid ${COLORS.grayText};
                      padding-top:0.8mm;font-size:4mm;color:${COLORS.darkGreen};
                      font-weight:700;box-sizing:border-box;">${escapeHtml(appName)}</div>
        </div>

        <!-- الـ QR (جهة اليسار في العربية) -->
        <div style="width:70mm;height:26mm;display:flex;align-items:center;justify-content:center;
                    direction:rtl;box-sizing:border-box;gap:4mm;">
          <div style="width:25mm;height:25mm;border:0.3mm solid ${COLORS.gold};padding:1mm;
                      box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:#fff;">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:22mm;height:22mm;display:block;" />` : ''}
          </div>
          <div style="width:38mm;text-align:right;box-sizing:border-box;">
            <div style="font-size:3.3mm;color:${COLORS.grayText};line-height:1.5;white-space:nowrap;">تحقق من صحة الشهادة</div>
            <div style="font-size:3.6mm;color:${COLORS.darkGreen};font-weight:700;
                        margin-top:1mm;line-height:1.4;white-space:nowrap;" dir="ltr">${escapeHtml(cert.certificateNumber)}</div>
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

    // تقليص الخط تلقائيًا للاسم واسم الدورة حتى يتسعا في سطر واحد (nowrap).
    // لا نستخدم overflow:hidden مطلقًا على النص — انظر تعليق leftFor().
    const fitSingleLine = (id: string, startMm: number, minMm: number) => {
      const el = container.querySelector<HTMLElement>(`#${id}`);
      if (!el) return;
      let size = startMm;
      el.style.fontSize = `${size}mm`;
      while (size > minMm && el.scrollWidth > el.clientWidth + 1) {
        size -= 0.5;
        el.style.fontSize = `${size}mm`;
      }
    };
    fitSingleLine('student-name', 15, 6);
    fitSingleLine('cycle-name', 7, 4);

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
