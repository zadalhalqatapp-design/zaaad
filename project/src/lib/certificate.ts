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
 *
 * ==== الإطار الزخرفي ====
 * الإطار (زوايا خضراء بنقش هندسي إسلامي + حدود ذهبية) هو صورة جاهزة
 * (public/certificate-frame.png) وليس مرسومًا بالكود. جميع عناصر النص
 * توضع بحيث تتجنّب الزوايا الأربع المزخرفة للصورة (انظر SAFE ZONE أدناه)
 * حتى لا يتراكب النص مع الزخرفة الخضراء في الزوايا.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import type { AppSettings, Certificate } from '@/types';

// ===== الهوية البصرية =====
const COLORS = {
  darkGreen: '#0B3D2E',
  medGreen: '#0F6B4F',
  gold: '#B8892B',
  lightGold: '#D9B85B',
  ivory: '#FBF8F0',
  white: '#FFFFFF',
  grayText: '#5B5B54',
} as const;

// مقاس الشهادة المنطقي: A4 أفقي حقيقي.
const PAGE_W_MM = 297;
const PAGE_H_MM = 210;

/*
 * ===== SAFE ZONE (منطقة الأمان بعيدًا عن زوايا الإطار) =====
 * الإطار (public/certificate-frame.png) يحتوي على أربع زخارف خضراء
 * مقوّسة في الزوايا الأربع، أقصى امتدادها القطري تقريبًا 50mm أفقيًا
 * و48mm رأسيًا عند حافة الزاوية تمامًا، ويتضاءل الامتداد كلما ابتعدنا
 * عن الزاوية على أي من المحورين.
 *
 * القاعدة العملية المستخدمة هنا: أي عنصر يقع رأسيًا ضمن الشريط العلوي
 * (0→TOP_BAND) أو السفلي (H-TOP_BAND→H) يجب أن يبقى أفقيًا ضمن
 * [SIDE_INSET, W-SIDE_INSET] لضمان عدم تراكبه مع أي زاوية، بغضّ النظر
 * عن ارتفاعه الدقيق ضمن ذلك الشريط. أما الشريط الأوسط (منتصف الصفحة
 * رأسيًا) فآمن بالكامل بعرض الصفحة الكامل.
 */
const TOP_BAND_MM = 50; // من الأعلى والأسفل
const SIDE_INSET_MM = 55; // من اليمين واليسار داخل الأشرطة العلوية/السفلية

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

/** نجمة إسلامية ثمانية بسيطة نستخدمها كعنصر زخرفي مركزي صغير */
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

/** شريط زخرفي (خط متدرّج + نجمة + خط متدرّج) بدون flex (انظر ملاحظة
 *  html2canvas في أسفل الملف) — يوضع أسفل عنوان الشهادة مباشرة */
function buildTitleFlourish(): string {
  return `
    <div style="text-align:center;white-space:nowrap;margin-top:3mm;line-height:0;">
      <span style="display:inline-block;vertical-align:middle;width:26mm;height:0.4mm;
                   background:linear-gradient(90deg,transparent,${COLORS.gold});"></span>
      <span style="display:inline-block;vertical-align:middle;margin:0 3mm;">${buildEightPointStar(5.5, COLORS.gold, 0.9)}</span>
      <span style="display:inline-block;vertical-align:middle;width:26mm;height:0.4mm;
                   background:linear-gradient(270deg,transparent,${COLORS.gold});"></span>
    </div>
  `;
}

function buildInfoBadge(label: string, value: string): string {
  return `
    <div style="width:60mm;box-sizing:border-box;text-align:center;
                padding:1.5mm 2mm;border-bottom:0.35mm solid ${COLORS.gold};position:relative;">
      <div style="color:${COLORS.grayText};font-size:4mm;font-weight:700;">${label}</div>
      <div style="color:${COLORS.darkGreen};font-size:5.4mm;font-weight:700;
                  margin-top:1.3mm;white-space:nowrap;overflow:hidden;
                  text-overflow:ellipsis;" dir="auto">${value}</div>
      <div style="position:absolute;bottom:-1.1mm;left:50%;transform:translateX(-50%);
                  width:1.5mm;height:1.5mm;background:${COLORS.gold};
                  border-radius:50%;"></div>
    </div>
  `;
}

interface CertificateAssets {
  logoUrl?: string;
  signatureUrl?: string;
  appName?: string;
}

/**
 * يحوّل رابط صورة إلى data URI (base64) مضمّن بالكامل داخل النص.
 *
 * لماذا هذا ضروري: مع foreignObjectRendering:true (المطلوب لحل مشكلة قصّ
 * النص العربي)، لا يقوم html2canvas بتصوير الصفحة الحيّة، بل "يُسلسل"
 * الشهادة إلى صورة SVG مستقلة قائمة بذاتها (data:image/svg+xml...) ثم
 * يحمّلها كصورة جديدة تمامًا منفصلة عن الصفحة. الصور المستقلة هذه ليس
 * لها "رابط أساس" (base URL) لحلّ المسارات النسبية مثل "/logo.png" أو
 * "/certificate-frame.png" — فتفشل هذه الموارد بالتحميل بصمت، وبما أن
 * صورة الإطار تغطي كامل الشهادة، فإن فشلها وحده يجعل الناتج صفحة بيضاء
 * فارغة تمامًا. الحل: تحويل كل صورة محلية إلى base64 مضمّن في نص الصفحة
 * نفسه قبل البناء، بحيث لا حاجة لتحميل أي رابط خارجي أو نسبي إطلاقًا.
 */
async function toDataUri(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    // في حال فشل التحويل (رابط خارجي محجوب بـ CORS مثلاً) نعيد الرابط
    // الأصلي كخطة بديلة بدل إفشال توليد الشهادة بالكامل.
    return url;
  }
}

export async function generateCertificatePDF(cert: Certificate, assets: CertificateAssets = {}): Promise<void> {
  const appName = assets.appName || 'زاد الحلقات';
  const logoUrlRaw = assets.logoUrl && assets.logoUrl.trim() ? assets.logoUrl : '/logo.png';
  const issueDateFormatted = formatDate(cert.issueDate);

  // نحوّل كل الصور المحلية/الخارجية إلى base64 قبل البناء (انظر توضيح
  // toDataUri أعلاه) — بالتوازي لتسريع التوليد.
  const [logoSrc, frameSrc, signatureSrc] = await Promise.all([
    toDataUri(logoUrlRaw),
    toDataUri('/certificate-frame.png'),
    assets.signatureUrl && assets.signatureUrl.trim() ? toDataUri(assets.signatureUrl) : Promise.resolve(''),
  ]);

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

  const signatureBlock = signatureSrc
    ? `<img src="${signatureSrc}" style="width:40mm;height:12mm;object-fit:contain;margin-bottom:1mm;" />`
    : `<div style="width:40mm;height:12mm;"></div>`;

  const container = document.createElement('div');
  // ملاحظة حاسمة: مع foreignObjectRendering:true، يعتمد html2canvas على محرك
  // رسم SVG/foreignObject الحقيقي في المتصفح، وهذا المحرك لا يرسم بشكل
  // صحيح (يُنتج صفحة بيضاء فارغة) إذا كان العنصر خارج حدود نافذة العرض
  // (viewport) تمامًا كما كان الحال سابقًا مع left:-99999px، أو إذا كانت
  // شفافيته (opacity) صفرًا (لأن المحرك يرسم الشكل المرئي فعليًا وليس
  // نسخة منطقية منه). لذلك نُبقي العنصر ضمن إحداثيات الشاشة (top:0, left:0)
  // بشفافية كاملة (opacity:1) ونُخفيه فقط عبر z-index سالب (خلف كل محتوى
  // الصفحة الفعلي) مع pointer-events:none حتى لا يظهر أو يتفاعل مع المستخدم.
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.zIndex = '-9999';
  container.style.pointerEvents = 'none';
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

      <!-- الإطار الزخرفي: صورة جاهزة تغطي الصفحة كاملة (بدون رسم SVG يدوي) -->
      <img src="${frameSrc}" alt=""
           style="position:absolute;inset:0;width:297mm;height:210mm;
                  object-fit:fill;display:block;z-index:0;" />

      <!-- طبقة المحتوى فوق الإطار -->
      <div style="position:absolute;inset:0;z-index:1;">

        <!-- البسملة (شريط علوي — عرض ضيق آمن) -->
        <div style="position:absolute;top:9mm;left:50%;transform:translateX(-50%);
                    width:110mm;text-align:center;color:${COLORS.gold};
                    font-family:'Amiri','Cairo',serif;font-size:4.6mm;font-weight:700;
                    letter-spacing:0.2mm;white-space:nowrap;">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>

        <!-- الشعار واسم المنصة: أعلى المنتصف — عرض ضيق آمن -->
        <div style="position:absolute;top:15mm;left:50%;transform:translateX(-50%);
                    width:90mm;display:block;text-align:center;box-sizing:border-box;">
          <img src="${logoSrc}" alt="شعار ${escapeHtml(appName)}"
               style="max-width:16mm;max-height:16mm;width:auto;height:auto;
                      object-fit:contain;display:block;margin:0 auto;" />
          <div style="color:${COLORS.darkGreen};font-size:4.6mm;font-weight:700;line-height:1;
                      margin-top:1.5mm;white-space:nowrap;">${escapeHtml(appName)}</div>
        </div>

        <!-- عنوان الشهادة: وسط الصفحة — عرض آمن ضمن الشريط العلوي -->
        <div style="position:absolute;top:41mm;left:50%;transform:translateX(-50%);
                    width:150mm;box-sizing:border-box;text-align:center;">
          <div style="color:${COLORS.darkGreen};font-family:'Amiri','Cairo',serif;
                      font-size:13mm;font-weight:700;line-height:1.1;white-space:nowrap;">شهادة إنجاز</div>
          ${buildTitleFlourish()}
        </div>

        <!-- النص التمهيدي (داخل الشريط الآمن الأوسط، عرض كامل متاح) -->
        <div style="position:absolute;top:69mm;left:50%;transform:translateX(-50%);
                    width:180mm;text-align:center;color:${COLORS.grayText};
                    font-size:5.2mm;line-height:1.5;box-sizing:border-box;">
          تشهد منصة ${escapeHtml(appName)} بأن
        </div>

        <!-- اسم الطالب: أوسع منطقة (الشريط الآمن الأوسط — بلا قيود عرض) -->
        <!-- ملاحظة: نتجنّب display:flex هنا لأن html2canvas يسيء التعامل معه
             مع نص عربي متغيّر الحجم ديناميكيًا، ونعتمد بدلاً منه على
             text-align لضمان رسم موثوق (نفس أسلوب بقية عناصر الشهادة). -->
        <div id="student-name-wrap" style="position:absolute;top:79mm;left:50%;transform:translateX(-50%);
                    width:230mm;height:24mm;box-sizing:border-box;overflow:hidden;text-align:center;">
          <div id="student-name" style="color:${COLORS.darkGreen};font-size:14mm;font-weight:700;
                      line-height:1.2;white-space:normal;word-break:normal;overflow-wrap:break-word;
                      text-align:center;width:225mm;max-width:225mm;margin:1mm auto 0 auto;
                      padding:0 2mm;box-sizing:border-box;">
            ${escapeHtml(cert.studentName)}
          </div>
        </div>
        <div style="position:absolute;top:106mm;left:50%;transform:translateX(-50%);
                    width:100mm;height:0.4mm;background:linear-gradient(90deg,transparent,
                    ${COLORS.gold},transparent);"></div>

        <!-- وصف الإنجاز (الشريط الآمن الأوسط) -->
        <div style="position:absolute;top:110mm;left:50%;transform:translateX(-50%);
                    width:210mm;text-align:center;box-sizing:border-box;
                    color:${COLORS.grayText};font-size:5.4mm;line-height:1.4;">
          <div>قد أتم برنامج</div>
          <div style="color:${COLORS.darkGreen};font-size:6.6mm;font-weight:700;margin-top:1.3mm;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" dir="auto">
            ${escapeHtml(cert.cycleName)}
          </div>
        </div>

        <!-- بيانات الإنجاز الثلاثة (الشريط الآمن الأوسط) -->
        <div style="position:absolute;top:135mm;left:50%;transform:translateX(-50%);
                    width:200mm;display:flex;justify-content:center;gap:8mm;
                    box-sizing:border-box;direction:rtl;">
          ${buildInfoBadge('نسبة الإنجاز', `${cert.progressPercent}%`)}
          ${buildInfoBadge('رقم الشهادة', escapeHtml(cert.certificateNumber))}
          ${buildInfoBadge('تاريخ الإصدار', escapeHtml(issueDateFormatted))}
        </div>

        <!-- دعاء قصير (يبدأ داخل الشريط الآمن الأوسط ويلامس بداية الشريط
             السفلي، لذا نُبقي عرضه ضمن حدود الأمان الجانبية) -->
        <div style="position:absolute;top:160mm;left:50%;transform:translateX(-50%);
                    width:185mm;text-align:center;color:${COLORS.grayText};
                    font-size:4.6mm;line-height:1.5;box-sizing:border-box;overflow:hidden;">
          ${escapeHtml(getDuaText(cert.studentGender))}
        </div>

        <!-- التوقيع + QR: داخل الشريط السفلي — عرض إجمالي محصور ضمن
             حدود الأمان الجانبية (SIDE_INSET_MM من كل جهة) -->
        <div style="position:absolute;top:178mm;left:50%;transform:translateX(-50%);
                    width:${PAGE_W_MM - SIDE_INSET_MM * 2}mm;height:24mm;
                    box-sizing:border-box;display:flex;align-items:flex-end;
                    justify-content:space-between;direction:rtl;">

          <!-- التوقيع (جهة اليمين في العربية) -->
          <div style="width:50mm;text-align:center;direction:rtl;box-sizing:border-box;">
            <div style="color:${COLORS.grayText};font-size:3.6mm;margin-bottom:0.5mm;">التوقيع</div>
            ${signatureBlock}
            <div style="width:40mm;margin:0 auto;border-top:0.3mm solid ${COLORS.grayText};
                        padding-top:0.7mm;font-size:3.8mm;color:${COLORS.darkGreen};
                        font-weight:700;box-sizing:border-box;">${escapeHtml(appName)}</div>
          </div>

          <!-- الـ QR (جهة اليسار في العربية) -->
          <div style="display:flex;align-items:center;justify-content:center;
                      direction:rtl;box-sizing:border-box;gap:3.5mm;">
            <div style="width:22mm;height:22mm;border:0.3mm solid ${COLORS.gold};padding:1mm;
                        box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:#fff;">
              ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:19mm;height:19mm;display:block;" />` : ''}
            </div>
            <div style="width:26mm;text-align:right;box-sizing:border-box;">
              <div style="font-size:3.1mm;color:${COLORS.grayText};line-height:1.4;">تحقق من صحة الشهادة</div>
              <div style="font-size:3.6mm;color:${COLORS.darkGreen};font-weight:700;
                          margin-top:0.8mm;line-height:1.3;word-break:break-word;" dir="ltr">
                ${escapeHtml(cert.certificateNumber)}
              </div>
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

    // Auto-fit لاسم الطالب ضمن صندوق ثابت الحجم (230mm × 26mm، overflow:hidden).
    // المقياس الصحيح هو صندوق الالتفاف الخارجي الثابت الحجم وليس العنصر الداخلي
    // نفسه (الذي يتمدد تلقائيًا مع محتواه ولذلك لا يكشف الفائض أبدًا).
    const wrapEl = container.querySelector<HTMLElement>('#student-name-wrap');
    const studentNameEl = container.querySelector<HTMLElement>('#student-name');
    if (wrapEl && studentNameEl) {
      let fontSize = 14;
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

    // ملاحظة حاسمة: foreignObjectRendering:true إلزامي هنا لحل مشكلة قصّ
    // الاسم العربي (انظر التعليق أعلاه). لكن بعض المتصفحات/البيئات قد
    // تُخرج صفحة بيضاء فارغة مع هذا الخيار لأسباب أخرى غير متوقعة، لذلك
    // نتحقق من الناتج: إن كانت الصورة فارغة فعليًا (كل البكسلات متطابقة
    // تقريبًا مع لون الخلفية) نُعيد المحاولة بدونه كخطة بديلة، حتى لا
    // يحصل المستخدم على شهادة فارغة بأي حال.
    async function renderCanvas(useForeignObject: boolean) {
      return html2canvas(container, {
        scale: 3,
        backgroundColor: COLORS.ivory,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: useForeignObject,
        logging: false,
      });
    }

    function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const w = canvas.width;
      const h = canvas.height;
      const samplePoints = [
        [Math.floor(w * 0.3), Math.floor(h * 0.4)],
        [Math.floor(w * 0.5), Math.floor(h * 0.4)],
        [Math.floor(w * 0.5), Math.floor(h * 0.55)],
        [Math.floor(w * 0.3), Math.floor(h * 0.65)],
      ];
      return samplePoints.every(([x, y]) => {
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
        // نعتبر البكسل "خلفية فارغة" إن كان قريبًا جدًا من لون العاج (ivory)
        return r > 245 && g > 240 && b > 225;
      });
    }

    let canvas = await renderCanvas(true);
    if (isCanvasBlank(canvas)) {
      canvas = await renderCanvas(false);
    }
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
