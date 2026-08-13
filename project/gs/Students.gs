/**
 * إدارة الطلاب
 */

function getStudents() {
  var sheet = getSheet(SHEETS.STUDENTS);
  var students = sheetToObjects(sheet);
  return students.map(function(s) { return sanitizeUser(s); });
}

function approveStudent(studentId, session) {
  requireRole(session, ['admin', 'supervisor']);
  var sheet = getSheet(SHEETS.STUDENTS);
  var student = findById(sheet, studentId);
  if (!student) throw new Error('الطالب غير موجود.');

  updateRow(sheet, studentId, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    rejectionReason: ''
  });

  // تعيين الدورة النشطة
  var cyclesSheet = getSheet(SHEETS.CYCLES);
  var cycles = sheetToObjects(cyclesSheet);
  var activeCycle = null;
  for (var i = 0; i < cycles.length; i++) {
    if (cycles[i].status === 'active') { activeCycle = cycles[i]; break; }
  }
  if (activeCycle) {
    var ids = String(activeCycle.studentIds || '').split(',').filter(Boolean);
    if (ids.indexOf(studentId) === -1) {
      ids.push(studentId);
      updateRow(cyclesSheet, activeCycle.id, { studentIds: ids.join(',') });
    }
  }

  logOperation(session, 'اعتماد طالب', student.name);
  return { success: true };
}

function rejectStudent(studentId, reason, session) {
  requireRole(session, ['admin', 'supervisor']);
  if (!reason || !reason.trim()) throw new Error('سبب الرفض مطلوب.');
  var sheet = getSheet(SHEETS.STUDENTS);
  var student = findById(sheet, studentId);
  if (!student) throw new Error('الطالب غير موجود.');

  updateRow(sheet, studentId, {
    status: 'rejected',
    rejectionReason: reason.trim()
  });

  logOperation(session, 'رفض طالب', student.name + ' — السبب: ' + reason);
  return { success: true };
}

function suspendStudent(studentId, reason, session) {
  requireRole(session, ['admin', 'supervisor']);
  if (!reason || !reason.trim()) throw new Error('سبب الإيقاف مطلوب.');
  var sheet = getSheet(SHEETS.STUDENTS);
  var student = findById(sheet, studentId);
  if (!student) throw new Error('الطالب غير موجود.');

  updateRow(sheet, studentId, {
    status: 'suspended',
    suspensionReason: reason.trim()
  });

  logOperation(session, 'إيقاف طالب', student.name + ' — السبب: ' + reason);
  return { success: true };
}

function reinstateStudent(studentId, session) {
  requireRole(session, ['admin', 'supervisor']);
  var sheet = getSheet(SHEETS.STUDENTS);
  var student = findById(sheet, studentId);
  if (!student) throw new Error('الطالب غير موجود.');

  updateRow(sheet, studentId, {
    status: 'approved',
    suspensionReason: ''
  });

  logOperation(session, 'تفعيل طالب', student.name);
  return { success: true };
}

function updateStudent(studentId, data, session) {
  requireRole(session, ['admin', 'supervisor']);
  var sheet = getSheet(SHEETS.STUDENTS);
  var student = findById(sheet, studentId);
  if (!student) throw new Error('الطالب غير موجود.');

  var allowed = ['name', 'phone', 'avatarUrl'];
  var updates = {};
  allowed.forEach(function(f) {
    if (data[f] !== undefined) updates[f] = data[f];
  });

  updateRow(sheet, studentId, updates);
  logOperation(session, 'تعديل طالب', student.name);
  return { success: true };
}

function deleteStudent(studentId, session) {
  requireRole(session, ['admin']);
  var sheet = getSheet(SHEETS.STUDENTS);
  var student = findById(sheet, studentId);
  if (!student) throw new Error('الطالب غير موجود.');

  deleteRowById(sheet, studentId);
  logOperation(session, 'حذف طالب', student.name);
  return { success: true };
}

/**
 * إعادة تعيين كلمة مرور طالب
 */
function resetPassword(studentId, session) {
  requireRole(session, ['admin', 'supervisor']);
  var sheet = getSheet(SHEETS.STUDENTS);
  var student = findById(sheet, studentId);
  if (!student) throw new Error('الطالب غير موجود.');

  var tempPassword = 'zad' + Math.floor(1000 + Math.random() * 9000);
  updateRow(sheet, studentId, { passwordHash: hashPassword(tempPassword) });
  logOperation(session, 'إعادة تعيين كلمة مرور', student.name);
  return { success: true, tempPassword: tempPassword };
}
