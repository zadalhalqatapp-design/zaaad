/** إعدادات المشروع. القيم الحساسة تُحفظ في Script Properties فقط. */

function getConfig(key, fallback) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  return value || fallback || '';
}

function getSpreadsheetId() {
  return getConfig('SPREADSHEET_ID', '');
}

function getDriveFolderId() {
  return getConfig('DRIVE_FOLDER_ID', '');
}

function getApiUrl() {
  return getConfig('API_URL', '');
}

function getJwtSecret() {
  return getConfig('JWT_SECRET', '');
}

function getSpreadsheet() {
  var id = getSpreadsheetId();
  if (!id) throw new Error('لم يتم إعداد SPREADSHEET_ID في خصائص المشروع.');
  return SpreadsheetApp.openById(id);
}

function getSheet(nameOrKey) {
  var name = SCHEMA.sheets[nameOrKey] || nameOrKey;
  var sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('الورقة غير موجودة: ' + name);
  return sheet;
}

function getSheetHeaders(nameOrKey) {
  var sheet = getSheet(nameOrKey);
  var lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

function getSheetData(nameOrKey) {
  var name = SCHEMA.sheets[nameOrKey] || nameOrKey;
  var sheet = getSheet(name);
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn === 0) return [];

  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  return rows.map(function (row) {
    var raw = {};
    headers.forEach(function (header, index) { raw[header] = row[index]; });
    return fromArabicRow(name, raw);
  });
}

function serialiseValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function appendSheetRow(nameOrKey, data, headers) {
  var name = SCHEMA.sheets[nameOrKey] || nameOrKey;
  var sheet = getSheet(name);
  var arabicData = toArabicRow(name, data);
  var row = headers.map(function (header) { return serialiseValue(arabicData[header]); });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  return data;
}

function findRowByValue(nameOrKey, colKey, value) {
  var name = SCHEMA.sheets[nameOrKey] || nameOrKey;
  var headers = getSheetHeaders(name);
  var column = colName(name, colKey);
  var columnIndex = headers.indexOf(column);
  if (columnIndex === -1) return -1;
  var sheet = getSheet(name);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, columnIndex + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(value)) return i + 2;
  }
  return -1;
}

function updateRowByValue(nameOrKey, matchKey, matchValue, updates) {
  var name = SCHEMA.sheets[nameOrKey] || nameOrKey;
  var headers = getSheetHeaders(name);
  var rowIndex = findRowByValue(name, matchKey, matchValue);
  if (rowIndex === -1) throw new Error('السجل غير موجود.');
  var arabicUpdates = toArabicRow(name, updates);
  var sheet = getSheet(name);
  var values = headers.map(function (header) {
    var value = arabicUpdates[header];
    return value === undefined ? null : serialiseValue(value);
  });
  var existing = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  values = values.map(function (value, index) { return value === null ? existing[index] : value; });
  sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
}

function generateId(prefix) {
  return (prefix || 'id') + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function nowIso() {
  return new Date().toISOString();
}
