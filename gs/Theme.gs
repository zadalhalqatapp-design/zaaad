/**
 * المظهر والهوية البصرية
 * ----------------------
 * يُخزَّن تصميم التطبيق (ألوان/خطوط/تنسيق/نصوص) كنص JSON واحد في ورقة «الإعدادات» تحت المفتاح
 * themeConfig، فيُطبَّق على كل الأجهزة (ويب وجوال) دون تعديل الشيفرة.
 *
 *  - getTheme()   عام (بلا دخول): تحتاجه شاشة الدخول لتظهر بهوية التطبيق.
 *  - saveTheme()  المدير فقط: يتحقق الخادم من كل حقل (قوائم بيضاء ونطاقات رقمية) فلا يمكن
 *                 حفظ قيمة تكسر الواجهة أو تحقن شيفرة، بصرف النظر عمّا يرسله العميل.
 *  - resetTheme() المدير فقط: يعيد المظهر الافتراضي.
 *
 * لا حاجة لأي ترحيل: ورقة الإعدادات موجودة أصلًا، والمفتاح يُنشأ عند أول حفظ.
 */

var THEME_KEY_ = 'themeConfig';

var THEME_COLOR_KEYS_ = [
  'primary', 'secondary', 'background', 'surface', 'text', 'textMuted',
  'border', 'success', 'warning', 'error'
];

// قائمة الخطوط المسموحة (خطوط ويب عربية من Google Fonts) + خط الجهاز
var THEME_FONTS_ = [
  'system', 'Cairo', 'Tajawal', 'Almarai', 'IBM Plex Sans Arabic', 'Noto Kufi Arabic',
  'Noto Naskh Arabic', 'Amiri', 'Scheherazade New', 'Lateef', 'Readex Pro',
  'El Messiri', 'Changa', 'Harmattan', 'Markazi Text', 'Reem Kufi'
];

var THEME_BUTTON_SHAPES_ = ['rounded', 'pill', 'square'];

// نصوص حساسة/رسمية لا يجوز تخصيصها من هذه الواجهة (شهادات، بيانات الطلاب، رسائل الأمان)
var THEME_BLOCKED_TEXT_PREFIXES_ = ['cert.', 'data.', 'student.', 'security.', 'legal.'];

function themeSetting_() {
  var rows = sheetToObjects(getSheet(SHEETS.SETTINGS));
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === THEME_KEY_) return rows[i];
  }
  return null;
}

function upsertSettingRaw_(key, value) {
  var sheet = getSheet(SHEETS.SETTINGS);
  var existing = themeSetting_();
  if (existing && key === THEME_KEY_) {
    updateRow(sheet, existing.key, { value: value });
  } else {
    appendRow(sheet, { key: key, value: value });
  }
}

/** يرجع إعدادات المظهر المحفوظة ({} إن لم يُخصَّص شيء). عام. */
function getTheme() {
  var row = themeSetting_();
  if (!row || !row.value) return { theme: {}, updatedAt: '' };
  try {
    var parsed = JSON.parse(String(row.value));
    return { theme: sanitizeTheme_(parsed), updatedAt: parsed.updatedAt || '' };
  } catch (e) {
    return { theme: {}, updatedAt: '' };
  }
}

function saveTheme(theme, session) {
  requireRole(session, ['admin']);
  var clean = sanitizeTheme_(theme);
  clean.updatedAt = new Date().toISOString();
  var json = JSON.stringify(clean);
  if (json.length > 45000) throw new Error('إعدادات المظهر كبيرة جدًا.');
  upsertSettingRaw_(THEME_KEY_, json);
  logOperation(session, 'تعديل المظهر والهوية البصرية', '');
  return { success: true, theme: clean, updatedAt: clean.updatedAt };
}

function resetTheme(session) {
  requireRole(session, ['admin']);
  var row = themeSetting_();
  if (row) updateRow(getSheet(SHEETS.SETTINGS), row.key, { value: '' });
  logOperation(session, 'استعادة المظهر الافتراضي', '');
  return { success: true, theme: {}, updatedAt: '' };
}

function themeNumber_(v, min, max) {
  var n = Number(v);
  if (isNaN(n)) return undefined;
  return Math.max(min, Math.min(max, n));
}

/** تنقية صارمة: أي حقل خارج المخطط أو بقيمة غير صالحة يُحذف بصمت. */
function sanitizeTheme_(t) {
  var out = {};
  if (!t || typeof t !== 'object') return out;

  if (t.colors && typeof t.colors === 'object') {
    out.colors = {};
    THEME_COLOR_KEYS_.forEach(function(k) {
      var v = t.colors[k];
      if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) out.colors[k] = v.toLowerCase();
    });
  }

  if (t.fonts && typeof t.fonts === 'object') {
    out.fonts = {};
    ['ui', 'hadith', 'explanation'].forEach(function(k) {
      if (THEME_FONTS_.indexOf(t.fonts[k]) !== -1) out.fonts[k] = t.fonts[k];
    });
    var bs = themeNumber_(t.fonts.baseSize, 14, 20);
    if (bs !== undefined) out.fonts.baseSize = Math.round(bs * 2) / 2;
    var lh = themeNumber_(t.fonts.lineHeight, 1.6, 2.8);
    if (lh !== undefined) out.fonts.lineHeight = Math.round(lh * 20) / 20;
    var fw = Number(t.fonts.weight);
    if ([400, 500, 600].indexOf(fw) !== -1) out.fonts.weight = fw;
  }

  if (t.layout && typeof t.layout === 'object') {
    out.layout = {};
    var r = themeNumber_(t.layout.radius, 0, 2);
    if (r !== undefined) out.layout.radius = Math.round(r * 20) / 20;
    var d = themeNumber_(t.layout.density, 0.85, 1.15);
    if (d !== undefined) out.layout.density = Math.round(d * 100) / 100;
    if (typeof t.layout.shadows === 'boolean') out.layout.shadows = t.layout.shadows;
    if (THEME_BUTTON_SHAPES_.indexOf(t.layout.buttonShape) !== -1) out.layout.buttonShape = t.layout.buttonShape;
  }

  if (t.texts && typeof t.texts === 'object') {
    out.texts = {};
    var count = 0;
    for (var key in t.texts) {
      if (count >= 250) break;
      if (!/^[A-Za-z0-9_.\-]{1,60}$/.test(key)) continue;
      var blocked = THEME_BLOCKED_TEXT_PREFIXES_.some(function(p) { return key.indexOf(p) === 0; });
      if (blocked) continue;
      var val = t.texts[key];
      if (typeof val !== 'string') continue;
      val = val.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
      if (!val || val.length > 200) continue;
      out.texts[key] = val;
      count++;
    }
  }
  return out;
}
