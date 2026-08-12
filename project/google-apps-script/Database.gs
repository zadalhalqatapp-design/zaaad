/** طبقة الوصول الموحدة إلى Google Sheets. */

var Database = {
  findAll: function (sheetKey) {
    return getSheetData(sheetKey);
  },

  findOne: function (sheetKey, column, value) {
    var rows = getSheetData(sheetKey);
    return rows.filter(function (row) { return String(row[column]) === String(value); })[0] || null;
  },

  findWhere: function (sheetKey, filters) {
    var rows = getSheetData(sheetKey);
    return rows.filter(function (row) {
      return Object.keys(filters).every(function (key) {
        return String(row[key]) === String(filters[key]);
      });
    });
  },

  insert: function (sheetKey, data) {
    var headers = getSheetHeaders(sheetKey);
    return appendSheetRow(sheetKey, data, headers);
  },

  insertMany: function (sheetKey, rows) {
    if (!rows || rows.length === 0) return [];
    var name = SCHEMA.sheets[sheetKey] || sheetKey;
    var sheet = getSheet(name);
    var headers = getSheetHeaders(name);
    var values = rows.map(function (data) {
      var arabicData = toArabicRow(name, data);
      return headers.map(function (header) { return serialiseValue(arabicData[header]); });
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
    return rows;
  },

  update: function (sheetKey, matchColumn, matchValue, updates) {
    updateRowByValue(sheetKey, matchColumn, matchValue, updates);
  },

  deleteWhere: function (sheetKey, column, value) {
    var rowIndex = findRowByValue(sheetKey, column, value);
    if (rowIndex !== -1) getSheet(sheetKey).deleteRow(rowIndex);
  },

  count: function (sheetKey, filters) {
    return filters ? this.findWhere(sheetKey, filters).length : this.findAll(sheetKey).length;
  },
};
