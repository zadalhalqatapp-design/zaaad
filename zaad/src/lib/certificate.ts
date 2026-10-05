/**
 * إصدار شهادة الإنجاز (PDF) — منصة زاد الحلقات
 * ------------------------------------------------
 * لماذا لا نستخدم jsPDF لرسم النص مباشرة؟
 * خطوط jsPDF المدمجة لاتينية فقط ولا تدعم تشكيل/ربط الحروف العربية ولا اتجاه RTL.
 * الحل: نبني الشهادة كعنصر HTML حقيقي (المتصفح يتكفّل بتشكيل العربية واتجاه RTL)،
 * ثم نحوّله إلى صورة عالية الدقة عبر html2canvas ونضعها في صفحة A4 أفقية (297×210mm).
 *
 * الإطار الجاهز (public/cert-frame.png) يحوي العنوان والبسملة والشعار والوسام؛
 * فنكتب فوقه فقط: فقرة الشهادة المتصلة، ثم الباركود والتاريخ أسفلها.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import type { Certificate } from '@/types';

const COLORS = {
  darkGreen: '#064E3B',
  ivory: '#FAF8F2',
  black: '#141414',
  gold: '#C9A227',
} as const;

// مقاس الشهادة المنطقي: A4 أفقي حقيقي.
const PAGE_W_MM = 297;
const PAGE_H_MM = 210;

const FRAME_SRC = '/cert-frame.png';

// خط الكتابة: أميري (نسخ عربي متصل وفاخر) — محمَّل من index.html.
const FONT = "'Amiri', 'Noto Naskh Arabic', serif";

function mm(value: number): string {
  return `${value}mm`;
}

/**
 * توسيط أفقي بإزاحة `left` صريحة بدل `left:50%; transform:translateX(-50%)`
 * (html2canvas يحسب القص دون تطبيق translateX فيقصّ النص المتوسّط).
 */
function leftFor(widthMm: number): string {
  return `left:${(PAGE_W_MM - widthMm) / 2}mm;`;
}

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

/** صيغ الكلمات المتغيّرة حسب جنس الطالب؛ وعند عدم تحديده تُكتب الصيغتان معًا. */
function genderForms(gender?: 'male' | 'female') {
  if (gender === 'male') {
    return { student: 'الطالب', grants: 'تمنحه', advises: 'توصيه' };
  }
  if (gender === 'female') {
    return { student: 'الطالبة', grants: 'تمنحها', advises: 'توصيها' };
  }
  return {
    student: 'الطالب / الطالبة',
    grants: 'تمنحه / تمنحها',
    advises: 'توصيه / توصيها',
  };
}

/** كلمة واحدة في الفقرة؛ bold = متغيّر (الاسم/الكتاب/النسبة/الدورة/التقدير) يُكتب بالأخضر الغامق. */
interface Tok {
  text: string;
  bold: boolean;
}

/**
 * فقرتان: (1) نص الشهادة، (2) الدعاء والوصية — تبدأ الثانية من سطر جديد.
 * اسم الدورة يبدأ غالبًا بكلمة «الدورة/دورة» فلا نكرّرها.
 */
function buildParagraphs(cert: Certificate, appName: string): Tok[][] {
  const g = genderForms(cert.studentGender);
  const book = (cert.bookTitle || '').trim();
  const grade = (cert.grade || '').trim();
  const cycleHasWord = /^(ال)?دورة(\s|$)/.test(cert.cycleName.trim());

  const tokens = (text: string, bold = false): Tok[] =>
    text.split(/\s+/).filter(Boolean).map((t) => ({ text: t, bold }));

  const certText: Tok[] = [
    ...tokens(`تشهد منصة ${appName} بأن ${g.student}:`),
    ...tokens(cert.studentName, true),
    ...tokens('قد أتمّ حفظ برنامج'),
    ...(book ? tokens(book, true) : []),
    ...tokens('بنسبة إنجاز'),
    ...tokens(`${cert.progressPercent}%`, true),
    ...tokens(cycleHasWord ? 'في' : 'في دورة'),
    ...tokens(cert.cycleName, true),
    ...(grade ? [...tokens('وقد حصل على تقدير:'), ...tokens(grade, true)] : []),
  ];

  const duaText: Tok[] = tokens(
    `والإدارة إذ ${g.grants} هذه الشهادة ${g.advises} بتقوى الله والسير على نهج السلف.`,
  );
  return [certText, duaText];
}

// ===== ضبط الأسطر بالكشيدة (التطويل) =====
// المتصفح لا يطوّل الحروف عند ضبط النص (justify يوسّع المسافات فقط)، فنحسب الأسطر بأنفسنا
// ونُدخل حرف التطويل «ـ» في الكلمات حتى يمتلئ كل سطر بعرض الصندوق تمامًا.

const JOIN_NEXT = 'بتثجحخسشصضطظعغفقكلمنهيئ';
const isArabicLetter = (c: string) => /[ء-ي]/.test(c);
const isMark = (c: string) => /[ً-ٰٟ]/.test(c);
const TATWEEL = 'ـ';
const MAX_TATWEEL_PER_WORD = 3;
const MM_TO_PX = 96 / 25.4;

/** مواضع إدخال التطويل الممكنة في الكلمة (فهارس قبل الحرف التالي)، مرتّبة من وسط الكلمة للأطراف. */
function kashidaSlots(word: string): number[] {
  const slots: number[] = [];
  for (let i = 0; i < word.length; i++) {
    const c = word[i];
    if (!JOIN_NEXT.includes(c)) continue;
    let j = i + 1;
    while (j < word.length && isMark(word[j])) j++;
    if (j >= word.length || !isArabicLetter(word[j])) continue;
    if (c === 'ل' && 'اأإآ'.includes(word[j])) continue; // لام‑ألف: ربط خاص لا يُقطع
    slots.push(j);
  }
  const mid = word.length / 2;
  return slots.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
}

interface LaidLine {
  toks: Tok[];
  wordSpacingPx: number;
  justified: boolean;
}

function layoutParagraph(
  ctx: CanvasRenderingContext2D,
  toks: Tok[],
  fontPx: number,
  widthPx: number,
): LaidLine[] {
  const font = (bold: boolean) => `${bold ? 700 : 400} ${fontPx}px Amiri`;
  const measure = (text: string, bold: boolean) => {
    ctx.font = font(bold);
    return ctx.measureText(text).width;
  };
  const spaceW = measure(' ', false);

  // 1) تقسيم الأسطر (جشع) بالعرض الطبيعي
  const rows: Tok[][] = [];
  let row: Tok[] = [];
  let rowW = 0;
  for (const t of toks) {
    const w = measure(t.text, t.bold);
    const need = row.length === 0 ? w : rowW + spaceW + w;
    if (need > widthPx && row.length > 0) {
      rows.push(row);
      row = [t];
      rowW = w;
    } else {
      row.push(t);
      rowW = need;
    }
  }
  if (row.length) rows.push(row);
  // لا نترك كلمة يتيمة في آخر سطر: ننقل إليها كلمة من السطر الذي قبلها
  if (rows.length > 1 && rows[rows.length - 1].length === 1 && rows[rows.length - 2].length > 3) {
    rows[rows.length - 1].unshift(rows[rows.length - 2].pop() as Tok);
  }

  // 2) ضبط كل سطر (عدا الأخير) بالتطويل ثم بتوسيع طفيف للمسافات
  return rows.map((r, idx): LaidLine => {
    const isLast = idx === rows.length - 1;
    if (isLast || r.length < 2) return { toks: r, wordSpacingPx: 0, justified: false };

    const words = r.map((t) => ({ ...t, slots: kashidaSlots(t.text), counts: new Map<number, number>(), total: 0 }));
    const build = (w: (typeof words)[number]) => {
      let out = '';
      for (let i = 0; i < w.text.length; i++) {
        const n = w.counts.get(i) ?? 0;
        if (n) out += TATWEEL.repeat(n);
        out += w.text[i];
      }
      return out;
    };
    const widths = words.map((w) => measure(w.text, w.bold));
    let natural = widths.reduce((a, b) => a + b, 0) + spaceW * (r.length - 1);
    let extra = widthPx - natural;

    let progressed = true;
    while (extra > 1 && progressed) {
      progressed = false;
      for (let k = 0; k < words.length && extra > 1; k++) {
        const w = words[k];
        if (w.total >= MAX_TATWEEL_PER_WORD || w.slots.length === 0) continue;
        const slot = w.slots[w.total % w.slots.length];
        w.counts.set(slot, (w.counts.get(slot) ?? 0) + 1);
        const newW = measure(build(w), w.bold);
        const delta = newW - widths[k];
        if (delta <= extra + 0.5) {
          w.total++;
          widths[k] = newW;
          extra -= delta;
          progressed = true;
        } else {
          w.counts.set(slot, (w.counts.get(slot) ?? 1) - 1); // لا يتّسع: تراجع
          w.total = MAX_TATWEEL_PER_WORD; // لا نحاول هذه الكلمة ثانية
        }
      }
    }
    natural = widths.reduce((a, b) => a + b, 0) + spaceW * (r.length - 1);
    const slack = widthPx - natural;
    return {
      toks: words.map((w) => ({ text: build(w), bold: w.bold })),
      wordSpacingPx: slack > 0 ? slack / (r.length - 1) : 0,
      justified: true,
    };
  });
}

/** يبني HTML الأسطر ويختار أكبر خط يتّسع داخل الصندوق. */
function buildJustifiedBodyHtml(
  paragraphs: Tok[][],
  widthMm: number,
  heightMm: number,
  maxMm: number,
  minMm: number,
): { html: string; sizeMm: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const LINE_H = 1.95;
  const PARA_GAP = 0.45; // فراغ إضافي (بعدد أسطر) بين الفقرتين
  let sizeMm = maxMm;
  let laid: LaidLine[][] = [];
  for (; sizeMm >= minMm; sizeMm -= 0.2) {
    if (!ctx) break;
    laid = paragraphs.map((p) => layoutParagraph(ctx, p, sizeMm * MM_TO_PX, widthMm * MM_TO_PX - 1));
    const lines = laid.reduce((n, p) => n + p.length, 0);
    if ((lines + PARA_GAP * (laid.length - 1)) * sizeMm * LINE_H <= heightMm) break;
  }
  sizeMm = Math.max(sizeMm, minMm);

  const tokHtml = (t: Tok) =>
    t.bold
      ? `<span style="color:${COLORS.darkGreen};font-weight:700;">${escapeHtml(t.text)}</span>`
      : escapeHtml(t.text);
  const html = laid
    .map((lines, pi) =>
      lines
        .map((ln, li) => {
          const gap = pi > 0 && li === 0 ? `margin-top:${(PARA_GAP * sizeMm * LINE_H).toFixed(2)}mm;` : '';
          return `<div style="width:${widthMm}mm;text-align:center;white-space:nowrap;font-size:${sizeMm}mm;` +
            `line-height:${LINE_H};word-spacing:${ln.wordSpacingPx.toFixed(3)}px;${gap}">` +
            `${ln.toks.map(tokHtml).join(' ')}</div>`;
        })
        .join(''),
    )
    .join('');
  return { html, sizeMm };
}

interface CertificateAssets {
  appName?: string;
  /** (قديم) لم يعد يُستخدم: الشعار والوسام جزء من صورة الإطار. */
  logoUrl?: string;
  signatureUrl?: string;
}

export async function generateCertificatePDF(cert: Certificate, assets: CertificateAssets = {}): Promise<void> {
  const appName = assets.appName || 'زاد الحلقات';
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

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-99999px';
  container.style.width = mm(PAGE_W_MM);
  container.style.height = mm(PAGE_H_MM);
  container.style.boxSizing = 'border-box';
  container.style.overflow = 'hidden';
  container.dir = 'rtl';
  container.style.fontFamily = FONT;
  container.style.background = COLORS.ivory;

  container.innerHTML = `
    <div style="width:297mm;height:210mm;box-sizing:border-box;position:relative;
                background:${COLORS.ivory};overflow:hidden;direction:rtl;color:${COLORS.black};font-family:${FONT};">

      <!-- الإطار الجاهز (العنوان + البسملة + الشعار + الوسام + الزخارف) يملأ الصفحة كاملة -->
      <img src="${FRAME_SRC}" alt="" crossorigin="anonymous"
           style="position:absolute;top:0;left:0;width:297mm;height:210mm;display:block;z-index:0;" />

      <!-- فقرة الشهادة المتصلة -->
      <div id="cert-body-box" style="position:absolute;top:60mm;${leftFor(196)}
                  width:196mm;height:104mm;display:flex;align-items:center;justify-content:center;
                  box-sizing:border-box;z-index:3;">
        <div id="cert-body" style="width:196mm;color:${COLORS.black};font-weight:400;"></div>
      </div>

      <!-- أسفل الشهادة: الباركود يسارًا والتاريخ يمينًا -->
      <div style="position:absolute;top:171mm;left:48mm;right:48mm;height:26mm;
                  box-sizing:border-box;display:flex;align-items:center;
                  justify-content:space-between;direction:rtl;z-index:3;">

        <!-- التاريخ (جهة اليمين في العربية) -->
        <div style="width:55mm;text-align:center;direction:rtl;box-sizing:border-box;">
          <div style="color:${COLORS.black};font-size:4.6mm;line-height:1.4;">تاريخ الإصدار</div>
          <div style="color:${COLORS.darkGreen};font-size:6.4mm;font-weight:700;line-height:1.4;" dir="ltr">${escapeHtml(issueDateFormatted)}</div>
        </div>

        <!-- الـ QR (جهة اليسار في العربية) -->
        <div style="width:70mm;height:26mm;display:flex;align-items:center;justify-content:center;
                    direction:rtl;box-sizing:border-box;gap:4mm;">
          <div style="width:25mm;height:25mm;border:0.3mm solid ${COLORS.gold};padding:1mm;
                      box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:transparent;">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:22mm;height:22mm;display:block;" />` : ''}
          </div>
          <div style="width:38mm;text-align:right;box-sizing:border-box;">
            <div style="font-size:3.6mm;color:${COLORS.black};line-height:1.5;white-space:nowrap;">تحقق من صحة الشهادة</div>
            <div style="font-size:3.8mm;color:${COLORS.darkGreen};font-weight:700;
                        margin-top:1mm;line-height:1.4;white-space:nowrap;" dir="ltr">${escapeHtml(cert.certificateNumber)}</div>
          </div>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    if ('fonts' in document) {
      // نمرّر نصًا عربيًا لأن خطوط Google مقسّمة بـunicode-range: التحميل بلا نص يجلب الجزء اللاتيني فقط
      await Promise.all([
        document.fonts.load('400 20px Amiri', 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'),
        document.fonts.load('700 20px Amiri', 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي0123456789%'),
      ]).catch(() => undefined);
      await document.fonts.ready;
    }

    // ننتظر تحميل كل الصور (الإطار خصوصًا) قبل الالتقاط وإلا يخرج PDF بلا إطار
    await Promise.all(
      Array.from(container.querySelectorAll('img')).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
      ),
    );

    // ضبط الفقرتين بالكشيدة داخل الصندوق (بعد تحميل الخط لأن القياس يعتمد عليه).
    const body = container.querySelector<HTMLElement>('#cert-body');
    if (body) {
      body.innerHTML = buildJustifiedBodyHtml(buildParagraphs(cert, appName), 196, 104, 8.4, 5.2).html;
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
