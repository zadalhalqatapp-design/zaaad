/**
 * إدارة الطلاب
 */

// ===== نطاق المشرف: الدورات المخصَّصة له =====
// المدير يخصّص لكل مشرف دورة أو أكثر (عمود cycleIds في ورقة المشرفين)، ولا يرى المشرف ولا يتصرف
// إلا في طلاب هذه الدورات. مشرف بلا دورات مخصَّصة لا يرى أي طالب.

/** معرّفات الدورات المخصَّصة لمشرف (مصفوفة). */
function supervisorCycleIds_(session) {
  var sup = findById(getSheet(SHEETS.SUPERVISORS), session.userId);
  if (!sup) return [];
  return String(sup.cycleIds || '').split(',').filter(Boolean);
}

/**
 * دورة الطالب الفعلية: عمود cycleId إن وُجد وكانت الدورة قائمة، وإلا (بيانات قديمة) الدورة التي
 * تضمّه في studentIds — النشطة أولًا ثم الأحدث بداية. فارغ = غير مسنَد لأي دورة.
 */
function resolveStudentCycleId_(student, cycles) {
  var byId = {};
  cycles.forEach(function(c) { byId[c.id] = c; });
  if (student.cycleId && byId[student.cycleId]) return student.cycleId;
  var best = null;
  cycles.forEach(function(c) {
    if (String(c.studentIds || '').split(',').indexOf(student.id) === -1) return;
    if (!best) { best = c; return; }
    var a = c.status === 'active' ? 1 : 0, b = best.status === 'active' ? 1 : 0;
    if (a !== b) { if (a > b) best = c; return; }
    if (new Date(c.startDate).getTime() > new Date(best.startDate).getTime()) best = c;
  });
  return best ? best.id : '';
}

/** كائن الدورة الخاصة بطالب (أو null). */
function studentCycle_(studentId) {
  var student = findById(getSheet(SHEETS.STUDENTS), studentId);
  if (!student) return null;
  var cycles = sheetToObjects(getSheet(SHEETS.CYCLES));
  var cid = resolveStudentCycleId_(student, cycles);
  for (var i = 0; i < cycles.length; i++) if (cycles[i].id === cid) return cycles[i];
  return null;
}

/**
 * null = بلا قيد (مدير/طالب/استدعاء داخلي)؛ وإلا كائن {studentId: true} بطلاب دورات المشرف فقط.
 * الطالب غير المسنَد لدورة (مثل طلب تسجيل جديد) لا يراه أي مشرف — المدير يسنده لدورة أولًا.
 */
function allowedStudentMap_(session) {
  if (!session || session.role !== 'supervisor') return null;
  var map = {};
  var mine = {};
  supervisorCycleIds_(session).forEach(function(id) { mine[id] = true; });
  if (Object.keys(mine).length === 0) return map;

  var cycles = sheetToObjects(getSheet(SHEETS.CYCLES));
  sheetToObjects(getSheet(SHEETS.STUDENTS)).forEach(function(s) {
    var cid = resolveStudentCycleId_(s, cycles);
    if (cid && mine[cid]) map[s.id] = true;
  });
  return map;
}

/** يمنع المشرف من التعامل مع طالب خارج دوراته. */
function assertStudentAccess_(session, studentId) {
  var map = allowedStudentMap_(session);
  if (map && !map[studentId]) throw new Error('هذا الطالب ليس ضمن الدورات المخصَّصة لك.');
}

function getStudents(session) {
  var sheet = getSheet(SHEETS.STUDENTS);
  var students = sheetToObjects(sheet);
  var map = allowedStudentMap_(session);
  if (map) students = students.filter(function(s) { return map[s.id]; });
  var cycles = sheetToObjects(getSheet(SHEETS.CYCLES));
  return students.map(function(s) {
    s.cycleId = resolveStudentCycleId_(s, cycles); // الدورة الفعلية حتى للبيانات القديمة
    return sanitizeUser(s);
  });
}

/** cycleId اختياري (للمدير): الدورة التي يُسنَد إليها الطالب عند الاعتماد. */
function approveStudent(studentId, session, cycleId) {
  requireRole(session, ['admin', 'supervisor']);
  assertStudentAccess_(session, studentId);
  var sheet = getSheet(SHEETS.STUDENTS);
  var student = findById(sheet, studentId);
  if (!student) throw new Error('الطالب غير موجود.');
  var cycles = sheetToObjects(getSheet(SHEETS.CYCLES));
  if (cycleId && session.role === 'admin' && !cycles.some(function(c) { return c.id === cycleId; })) {
    throw new Error('الدورة غير موجودة.');
  }

  updateRow(sheet, studentId, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    rejectionReason: ''
  });

  // إسناد الدورة: المختارة من المدير، وإلا إن لم يكن للطالب دورة وكانت هناك دورة نشطة واحدة فقط فهي،
  // وإلا يبقى بلا دورة حتى يسنده المدير (لا يراه أي مشرف قبل ذلك).
  var targetCycle = '';
  if (cycleId && session.role === 'admin') {
    targetCycle = cycleId;
  } else if (!resolveStudentCycleId_(student, cycles)) {
    var actives = cycles.filter(function(c) { return c.status === 'active'; });
    if (actives.length === 1) targetCycle = actives[0].id;
  }
  if (targetCycle) assignStudentCycle_(studentId, targetCycle);

  autoAssignBooksToStudent_(studentId);

  logOperation(session, 'اعتماد طالب', student.name);
  return { success: true };
}

function rejectStudent(studentId, reason, session) {
  requireRole(session, ['admin', 'supervisor']);
  assertStudentAccess_(session, studentId);
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
  assertStudentAccess_(session, studentId);
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
  assertStudentAccess_(session, studentId);
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
  assertStudentAccess_(session, studentId);
  var sheet = getSheet(SHEETS.STUDENTS);
  var student = findById(sheet, studentId);
  if (!student) throw new Error('الطالب غير موجود.');

  var allowed = ['name', 'phone', 'avatarUrl', 'gender'];
  var updates = {};
  allowed.forEach(function(f) {
    if (data[f] !== undefined) updates[f] = data[f];
  });
  if (updates.gender !== undefined && updates.gender !== 'male' && updates.gender !== 'female') {
    throw new Error('قيمة الجنس غير صالحة.');
  }

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
  removeAssignmentsWhere_(function(a) { return a.studentId === studentId; });
  getAchievementsRaw_().forEach(function(a) {
    if (a.studentId === studentId) deleteRowById(getSheet(SHEETS.ACHIEVEMENTS), a.id);
  });
  logOperation(session, 'حذف طالب', student.name);
  return { success: true };
}

/**
 * إعادة تعيين كلمة مرور طالب
 */
function resetPassword(studentId, session) {
  requireRole(session, ['admin', 'supervisor']);
  assertStudentAccess_(session, studentId);
  var sheet = getSheet(SHEETS.STUDENTS);
  var student = findById(sheet, studentId);
  if (!student) throw new Error('الطالب غير موجود.');

  var tempPassword = 'zad' + Math.floor(1000 + Math.random() * 9000);
  updateRow(sheet, studentId, { passwordHash: hashPassword(tempPassword) });
  logOperation(session, 'إعادة تعيين كلمة مرور', student.name);
  return { success: true, tempPassword: tempPassword };
}
