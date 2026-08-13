/**
 * أدوات مساعدة عامة
 */

/** توليد معرّف فريد */
function uuid() {
  return Utilities.getUuid();
}

/** توليد طوكن جلسة */
function generateToken() {
  return Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
}

/** تشفير كلمة المرور باستخدام SHA-256 */
function hashPassword(password) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + 'zad_salt_2024');
  return raw.map(function(b) {
    return (b & 0xff).toString(16).padStart(2, '0');
  }).join('');
}

/** التحقق من كلمة المرور */
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

/** الحصول على جدول البيانات (يدعم النشر المستقل والمربوط) */
function getSpreadsheet() {
  // عند النشر من داخل جدول بيانات
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  // عند النشر المستقل — استخدم المعرف أدناه
  if (typeof SPREADSHEET_ID === 'string' && SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  throw new Error('لم يتم ضبط معرف جدول البيانات. شغّل setupSheets() أو اضبط SPREADSHEET_ID.');
}

/** الحصول على ورقة العمل بالاسم */
function getSheet(name) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('ورقة العمل غير موجودة: ' + name + '. شغّل setupSheets() أولًا.');
  return sheet;
}

/** قراءة جميع صفوف ورقة العمل ككائنات */
function sheetToObjects(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i].every(function(c) { return c === '' || c === null; })) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[i][j];
    }
    obj._row = i + 1; // 1-indexed row number
    rows.push(obj);
  }
  return rows;
}

/** البحث عن صف بمعرّف */
function findById(sheet, id) {
  var rows = sheetToObjects(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === id) return rows[i];
  }
  return null;
}

/** إضافة صف جديد */
function appendRow(sheet, obj) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
  return obj;
}

/** تحديث صف بمعرّف */
function updateRow(sheet, id, updates) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      for (var j = 0; j < headers.length; j++) {
        if (updates[headers[j]] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(updates[headers[j]]);
        }
      }
      return true;
    }
  }
  return false;
}

/** حذف صف بمعرّف */
function deleteRowById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

/** تنسيق التاريخ */
function formatDate(date) {
  if (!date) return '';
  var d = new Date(date);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/** تنسيق التاريخ والوقت */
function formatDateTime(date) {
  if (!date) return '';
  var d = new Date(date);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

/** تنسيق كقيمة منطقية */
function toBool(val) {
  return val === true || val === 'true' || val === 'TRUE' || val === 1 || val === '1';
}

/** تنظيف كلمة المرور من بيانات المستخدم */
function sanitizeUser(user) {
  if (!user) return null;
  var clean = {};
  for (var key in user) {
    if (key !== 'passwordHash' && key !== '_row') {
      clean[key] = user[key];
    }
  }
  return clean;
}
