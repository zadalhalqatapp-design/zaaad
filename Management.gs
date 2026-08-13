/**
 * الملف الشخصي والإعدادات وسجل العمليات والنسخ الاحتياطية ولوحة التحكم
 */

// ===== الملف الشخصي =====

function updateProfile(data, session) {
  if (!session) throw new Error('غير مصرح.');
  var sheetName = session.role === 'admin' ? SHEETS.ADMINS : session.role === 'supervisor' ? SHEETS.SUPERVISORS : SHEETS.STUDENTS;
  var sheet = getSheet(sheetName);
  var user = findById(sheet, session.userId);
  if (!user) throw new Error('المستخدم غير موجود.');

  var updates = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;

  updateRow(sheet, session.userId, updates);
  logOperation(session, 'تعديل الملف الشخصي', '');
  return { success: true };
}

function changePassword(oldPassword, newPassword, session) {
  if (!session) throw new Error('غير مصرح.');
  if (!newPassword || newPassword.length < 6) throw new Error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.');

  var sheetName = session.role === 'admin' ? SHEETS.ADMINS : session.role === 'supervisor' ? SHEETS.SUPERVISORS : SHEETS.STUDENTS;
  var sheet = getSheet(sheetName);
  var user = findById(sheet, session.userId);
  if (!user) throw new Error('المستخدم غير موجود.');

  if (!verifyPassword(oldPassword, user.passwordHash)) {
    throw new Error('كلمة المرور الحالية غير صحيحة.');
  }

  updateRow(sheet, session.userId, { passwordHash: hashPassword(newPassword) });
  logOperation(session, 'تغيير كلمة المرور', '');
  return { success: true };
}

// ===== الإعدادات =====

function getSettings() {
  var sheet = getSheet(SHEETS.SETTINGS);
  var rows = sheetToObjects(sheet);
  var settings = {
    appName: 'زاد الحلقات',
    logoUrl: '',
    primaryColor: '#2d8068',
    secondaryColor: '#d88f20',
    aboutText: '',
    contactEmail: '',
    contactPhone: '',
    videoCompletionThreshold: 90,
    audioCompletionThreshold: 90,
    pdfCompletionThreshold: 90,
    signatureUrl: ''
  };
  rows.forEach(function(r) {
    settings[r.key] = r.value;
  });
  ['videoCompletionThreshold', 'audioCompletionThreshold', 'pdfCompletionThreshold'].forEach(function(k) {
    var n = Number(settings[k]);
    settings[k] = isNaN(n) || n <= 0 ? 90 : Math.min(100, n);
  });
  return settings;
}

function updateSettings(data, session) {
  requireRole(session, ['admin']);
  var sheet = getSheet(SHEETS.SETTINGS);
  var rows = sheetToObjects(sheet);

  for (var key in data) {
    var found = false;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].key === key) {
        updateRow(sheet, rows[i].id || rows[i].key, { value: data[key] });
        found = true;
        break;
      }
    }
    if (!found) {
      appendRow(sheet, { key: key, value: data[key] });
    }
  }

  logOperation(session, 'تعديل الإعدادات', '');
  return { success: true };
}

// ===== سجل العمليات =====

function getOperationLog() {
  var sheet = getSheet(SHEETS.OPERATION_LOG);
  var logs = sheetToObjects(sheet);
  logs.sort(function(a, b) {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  return logs.slice(0, 200).map(function(l) { delete l._row; return l; });
}

function logOperation(session, operation, details) {
  try {
    var sheet = getSheet(SHEETS.OPERATION_LOG);
    var user = session || { userId: 'system', name: 'النظام', role: 'system' };
    sheet.appendRow([
      uuid(),
      formatDateTime(new Date()),
      user.userId || '',
      user.name || '',
      user.role || '',
      operation,
      details || ''
    ]);
  } catch (e) {
    // تجاهل أخطاء التسجيل
  }
}

// ===== لوحة التحكم =====

function getDashboard(session) {
  var students = sheetToObjects(getSheet(SHEETS.STUDENTS));
  var pendingCount = students.filter(function(s) { return s.status === 'pending'; }).length;
  var approvedCount = students.filter(function(s) { return s.status === 'approved'; }).length;
  var hadiths = sheetToObjects(getSheet(SHEETS.HADITHS));
  var certs = sheetToObjects(getSheet(SHEETS.CERTIFICATES));

  var cycles = sheetToObjects(getSheet(SHEETS.CYCLES));
  var activeCycle = null;
  for (var i = 0; i < cycles.length; i++) {
    if (cycles[i].status === 'active') { activeCycle = cycles[i]; break; }
  }

  var logs = sheetToObjects(getSheet(SHEETS.OPERATION_LOG));
  logs.sort(function(a, b) {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // أحدث طلبات التسجيل
  var recentRegs = students
    .filter(function(s) { return s.status === 'pending'; })
    .sort(function(a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); })
    .slice(0, 5)
    .map(function(s) { return sanitizeUser(s); });

  return {
    stats: {
      totalStudents: students.length,
      pendingStudents: pendingCount,
      approvedStudents: approvedCount,
      activeCycle: activeCycle,
      hadithsCount: hadiths.length,
      certificatesCount: certs.length
    },
    recentOperations: logs.slice(0, 5).map(function(l) { delete l._row; return l; }),
    recentRegistrations: recentRegs
  };
}

// ===== النسخ الاحتياطية =====

function getBackups() {
  var sheet = getSheet(SHEETS.BACKUPS);
  var backups = sheetToObjects(sheet);
  backups.sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return backups.map(function(b) {
    delete b._row;
    delete b.data; // لا نرجع بيانات النسخة في القائمة
    return b;
  });
}

function backupDatabase(name, session) {
  requireRole(session, ['admin']);
  var ss = getSpreadsheet();
  var sheets = ss.getSheets();
  var backupData = {};

  sheets.forEach(function(sheet) {
    var sheetName = sheet.getName();
    if (SHEET_HEADERS[sheetName]) {
      backupData[sheetName] = sheet.getDataRange().getValues();
    }
  });

  var dataStr = JSON.stringify(backupData);
  var id = uuid();
  var backup = {
    id: id,
    name: name || ('نسخة ' + formatDateTime(new Date())),
    createdAt: formatDateTime(new Date()),
    size: Math.round(dataStr.length / 1024) + ' KB',
    createdBy: session.name,
    data: dataStr
  };

  appendRow(getSheet(SHEETS.BACKUPS), backup);
  logOperation(session, 'نسخة احتياطية', backup.name);
  return { success: true };
}

function restoreBackup(backupId, session) {
  requireRole(session, ['admin']);
  var sheet = getSheet(SHEETS.BACKUPS);
  var backup = findById(sheet, backupId);
  if (!backup) throw new Error('النسخة غير موجودة.');

  var data = JSON.parse(backup.data);
  var ss = getSpreadsheet();

  for (var sheetName in data) {
    var targetSheet = ss.getSheetByName(sheetName);
    if (targetSheet && data[sheetName] && data[sheetName].length > 0) {
      var rows = data[sheetName].length;
      var cols = data[sheetName][0].length;
      // مسح البيانات الحالية (مع الحفاظ على الرؤوس)
      targetSheet.getRange(2, 1, Math.max(targetSheet.getLastRow() - 1, 1), cols).clearContent();
      // كتابة البيانات
      if (rows > 1) {
        targetSheet.getRange(2, 1, rows - 1, cols).setValues(data[sheetName].slice(1));
      }
    }
  }

  logOperation(session, 'استعادة نسخة', backup.name);
  return { success: true };
}
