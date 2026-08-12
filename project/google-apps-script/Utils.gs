/**
 * أدوات مساعدة — Utilities
 */

function logError(err) {
  try {
    var msg = err && err.message ? err.message : String(err);
    var stack = err && err.stack ? err.stack : '';
    Database.insert('SystemLogs', {
      id: generateId('log'),
      level: 'error',
      message: msg,
      stack: stack,
      created_at: nowIso(),
    });
  } catch (e) {
    console.error('Failed to log error:', err, e);
  }
}

function parseJson(str, fallback) {
  try { return JSON.parse(str); } catch (e) { return fallback; }
}

/** إعداد الجداول — شغّل هذه الدالة مرة واحدة لإنشاء جميع الأوراق */
function setupSheets() {
  var ss = SpreadsheetApp.openById(getSpreadsheetId());
  var schemas = getSheetSchemas();

  for (var name in schemas) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    var headers = schemas[name];
    if (sheet.getLastColumn() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
  }
}

function getSheetSchemas() {
  return SCHEMA.columns;
}
