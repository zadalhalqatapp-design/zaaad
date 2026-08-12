/** إنشاء بنية قاعدة Google Sheets العربية دون إضافة أي بيانات تجريبية. */

function setupDatabase() {
  var spreadsheet = getSpreadsheet();
  var created = [];
  var existing = [];

  Object.keys(SCHEMA.sheets).forEach(function (key) {
    var name = SCHEMA.sheets[key];
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      created.push(name);
    } else {
      existing.push(name);
    }

    var headers = SCHEMA.columns[name] || [];
    if (headers.length === 0) return;
    var currentHeaders = sheet.getLastColumn() > 0
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      : [];

    if (currentHeaders.length === 0 || currentHeaders.every(function (value) { return value === ''; })) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else if (currentHeaders.join('|') !== headers.join('|')) {
      throw new Error('عناوين الورقة لا تطابق المخطط: ' + name);
    }
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  });

  var seedResult = seedDefaultManager();

  return { created: created, existing: existing, rowsAdded: 0, managerSeed: seedResult };
}

function seedDefaultManager() {
  var email = 'amkh1409@gmail.com';
  var existing = Database.findOne('Users', 'email', email);
  if (existing) return { seeded: false, message: 'حساب المدير موجود مسبقًا.' };

  var userId = generateId('usr');
  var now = nowIso();
  var user = {
    id: userId,
    full_name: 'مدير النظام',
    email: email,
    role: 'manager',
    status: 'approved',
    password_hash: hashPassword('112233'),
    phone: '',
    avatar_url: '',
    created_at: now,
    updated_at: now,
  };
  Database.insert('Users', user);
  return { seeded: true, message: 'تم إنشاء حساب المدير الافتراضي.' };
}

function verifyDatabaseSchema() {
  var spreadsheet = getSpreadsheet();
  var missing = [];
  var invalid = [];
  Object.keys(SCHEMA.sheets).forEach(function (key) {
    var name = SCHEMA.sheets[key];
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      missing.push(name);
      return;
    }
    var expected = SCHEMA.columns[name] || [];
    var actual = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    if (actual.join('|') !== expected.join('|')) invalid.push(name);
  });
  return { valid: missing.length === 0 && invalid.length === 0, missing: missing, invalid: invalid };
}
