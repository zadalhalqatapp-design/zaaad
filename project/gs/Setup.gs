/**
 * تهيئة قاعدة البيانات — إنشاء جميع الأوراق الـ16
 * شغّل هذه الدالة مرة واحدة يدويًا
 */
function setupSheets() {
  var ss = getSpreadsheet();

  for (var sheetName in SHEET_HEADERS) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    // كتابة الرؤوس
    var headers = SHEET_HEADERS[sheetName];
    var existing = sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn() || 1)).getValues()[0];
    var needsUpdate = false;
    for (var i = 0; i < headers.length; i++) {
      if (existing[i] !== headers[i]) { needsUpdate = true; break; }
    }
    if (needsUpdate || sheet.getLastColumn() < headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      // تنسيق الرؤوس
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#1f664f')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setFontSize(11);
    }
    sheet.setFrozenRows(1);
  }

  // حذف ورقة Sheet1 الافتراضية إذا وجدت
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  // إدراج إعدادات افتراضية
  setupDefaultSettings();

  // إنشاء حساب مدير افتراضي إذا لم يوجد
  var adminsSheet = getSheet(SHEETS.ADMINS);
  var admins = sheetToObjects(adminsSheet);
  var existingAdmin = admins.find(function(a) { return String(a.email).toLowerCase() === 'amkh1409@gmail.com'; });
  if (!existingAdmin) {
    // حذف أي مدير قديم افتراضي ثم إدراج الجديد
    admins.forEach(function(a) {
      if (String(a.email).toLowerCase() === 'admin@zad.com') {
        deleteRowById(adminsSheet, a.id);
      }
    });
    appendRow(adminsSheet, {
      id: uuid(),
      name: 'المدير العام',
      email: 'amkh1409@gmail.com',
      passwordHash: hashPassword('112233'),
      phone: '',
      status: 'approved',
      createdAt: new Date().toISOString(),
      avatarUrl: ''
    });
  }

  ss.toast('تم إنشاء جميع الأوراق الـ16 بنجاح!', 'زاد الحلقات');
}

/** إدراج إعدادات افتراضية */
function setupDefaultSettings() {
  var sheet = getSheet(SHEETS.SETTINGS);
  var existing = sheetToObjects(sheet);
  if (existing.length > 0) return;

  var defaults = [
    { key: 'appName', value: 'زاد الحلقات' },
    { key: 'logoUrl', value: '' },
    { key: 'primaryColor', value: '#2d8068' },
    { key: 'secondaryColor', value: '#d88f20' },
    { key: 'aboutText', value: 'برنامج علمي مكثف لحفظ الأحاديث النبوية — 40 حديثًا في 20 يومًا' },
    { key: 'contactEmail', value: 'contact@zad.com' },
    { key: 'contactPhone', value: '' }
  ];

  defaults.forEach(function(d) {
    appendRow(sheet, d);
  });
}

/**
 * إضافة بيانات تجريبية للأحاديث (اختياري)
 */
function seedHadiths() {
  var sheet = getSheet(SHEETS.HADITHS);
  var existing = sheetToObjects(sheet);
  if (existing.length > 0) return;

  var samples = [
    { text: 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى', explanation: 'العمال معتبرة بالنية...', category: 'الإخلاص', narrator: 'البخاري' },
    { text: 'المسلم من سلم المسلمون من لسانه ويده', explanation: 'الإسلام الحقيقي...', category: 'الأخلاق', narrator: 'البخاري' },
    { text: 'من حسن إسلام المرء تركه ما لا يعنيه', explanation: 'من علامات حسن الإسلام...', category: 'الأخلاق', narrator: 'الترمذي' },
    { text: 'لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه', explanation: 'كمال الإيمان...', category: 'الإيمان', narrator: 'البخاري' },
    { text: ' الدين النصيحة', explanation: 'النصيحة أساس الدين...', category: 'الدين', narrator: 'مسلم' },
  ];

  samples.forEach(function(s, i) {
    appendRow(sheet, {
      id: uuid(),
      number: i + 1,
      text: s.text,
      explanation: s.explanation,
      youtubeUrl: '',
      audioUrl: '',
      pdfUrl: '',
      category: s.category,
      narrator: s.narrator
    });
  });

  getSpreadsheet().toast('تمت إضافة أحاديث تجريبية', 'زاد الحلقات');
}
