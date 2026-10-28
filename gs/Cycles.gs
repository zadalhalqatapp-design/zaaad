/**
 * إدارة الدورات والشهادات
 */

// ===== الدورات =====

/** المشرف يرى دوراته المخصَّصة فقط؛ غيره (أو استدعاء داخلي بلا جلسة) يرى الكل. */
function getCycles(session) {
  var sheet = getSheet(SHEETS.CYCLES);
  var mine = null;
  if (session && session.role === 'supervisor') {
    mine = {};
    supervisorCycleIds_(session).forEach(function(id) { mine[id] = true; });
  }
  return sheetToObjects(sheet).filter(function(c) { return !mine || mine[c.id]; }).map(function(c) {
    c.studentIds = String(c.studentIds || '').split(',').filter(Boolean);
    delete c._row;
    return c;
  });
}

function startCycle(name, studentIds, session) {
  requireRole(session, ['admin']);
  if (!name || !name.trim()) throw new Error('اسم الدورة مطلوب.');

  var sheet = getSheet(SHEETS.CYCLES);
  // الدورات السابقة تبقى نشطة؛ لا تنتهي دورة إلا بإنهائها يدويًا (completeCycle).

  var startDate = new Date();
  var endDate = new Date(startDate.getTime() + PROGRAM_DAYS * 24 * 60 * 60 * 1000);

  var cycle = {
    id: uuid(),
    name: name.trim(),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    status: 'active',
    studentIds: ''
  };
  appendRow(sheet, cycle);

  // إسناد الطلاب المحدَّدين للدورة الجديدة (ينتقلون من دورتهم السابقة النشطة إن وُجدت)
  var existingStudents = {};
  sheetToObjects(getSheet(SHEETS.STUDENTS)).forEach(function(s) { existingStudents[s.id] = true; });
  (studentIds || []).forEach(function(sid) {
    if (existingStudents[sid]) assignStudentCycle_(sid, cycle.id);
  });

  logOperation(session, 'بدء دورة', name);
  return { success: true, cycleId: cycle.id };
}

/**
 * يُسنِد طالبًا لدورة واحدة (cycleId فارغ = بلا دورة): يضبط عمود cycleId ويضمّه لـstudentIds
 * الدورة المطلوبة ويُخرجه من الدورات النشطة الأخرى (الدورات المنتهية تحتفظ بسجلّها).
 */
function assignStudentCycle_(studentId, cycleId) {
  var cyclesSheet = getSheet(SHEETS.CYCLES);
  sheetToObjects(cyclesSheet).forEach(function(c) {
    var ids = String(c.studentIds || '').split(',').filter(Boolean);
    var has = ids.indexOf(studentId) !== -1;
    var want = c.id === cycleId;
    if (has && !want && (!cycleId || c.status === 'active')) {
      updateRow(cyclesSheet, c.id, { studentIds: ids.filter(function(x) { return x !== studentId; }).join(',') });
    } else if (!has && want) {
      ids.push(studentId);
      updateRow(cyclesSheet, c.id, { studentIds: ids.join(',') });
    }
  });
  updateRow(getSheet(SHEETS.STUDENTS), studentId, { cycleId: cycleId || '' });
}

/** المدير وحده يسند (أو ينقل) طالبًا إلى دورة؛ cycleId فارغ = إزالة الإسناد. */
function setStudentCycle(studentId, cycleId, session) {
  requireRole(session, ['admin']);
  var student = findById(getSheet(SHEETS.STUDENTS), studentId);
  if (!student) throw new Error('الطالب غير موجود.');
  var cycle = null;
  if (cycleId) {
    cycle = findById(getSheet(SHEETS.CYCLES), cycleId);
    if (!cycle) throw new Error('الدورة غير موجودة.');
  }
  assignStudentCycle_(studentId, cycleId || '');
  logOperation(session, 'إسناد طالب لدورة', student.name + ' → ' + (cycle ? cycle.name : 'بلا دورة'));
  return { success: true };
}

function completeCycle(cycleId, session) {
  requireRole(session, ['admin']);
  var sheet = getSheet(SHEETS.CYCLES);
  var cycle = findById(sheet, cycleId);
  if (!cycle) throw new Error('الدورة غير موجودة.');

  updateRow(sheet, cycleId, { status: 'completed' });
  logOperation(session, 'إنهاء دورة', cycle.name);
  return { success: true };
}

/**
 * المدير وحده يحذف دورة نهائيًا. يُفكّ إسناد طلابها (يبقون معتمدين بلا دورة) ويُزال إسنادها من
 * أي مشرف. الشهادات الصادرة لا تُمسّ — تحتفظ باسم الدورة المكتوب فيها.
 */
function deleteCycle(cycleId, session) {
  requireRole(session, ['admin']);
  var cyclesSheet = getSheet(SHEETS.CYCLES);
  var cycle = findById(cyclesSheet, cycleId);
  if (!cycle) throw new Error('الدورة غير موجودة.');

  var studentsSheet = getSheet(SHEETS.STUDENTS);
  var unassigned = 0;
  sheetToObjects(studentsSheet).forEach(function(s) {
    if (s.cycleId === cycleId) {
      updateRow(studentsSheet, s.id, { cycleId: '' });
      unassigned++;
    }
  });
  // طلاب مدرجون في studentIds الدورة دون عمود cycleId (بيانات قديمة) لا يحتاجون تعديلًا: الصف يُحذف.

  var supervisorsSheet = getSheet(SHEETS.SUPERVISORS);
  sheetToObjects(supervisorsSheet).forEach(function(sv) {
    var ids = String(sv.cycleIds || '').split(',').filter(Boolean);
    if (ids.indexOf(cycleId) !== -1) {
      updateRow(supervisorsSheet, sv.id, {
        cycleIds: ids.filter(function(x) { return x !== cycleId; }).join(',')
      });
    }
  });

  deleteRowById(cyclesSheet, cycleId);
  logOperation(session, 'حذف دورة', cycle.name + ' (فُكّ إسناد ' + unassigned + ' طالب)');
  return { success: true, unassigned: unassigned };
}

// ===== الشهادات =====

/**
 * التحقق من صحة شهادة بمحتوى رمز QR (عام: بلا تسجيل دخول). يقبل صيغتين:
 *   نص:  ZAD_CERT:<id>:<number>        (تطبيق الأندرويد)
 *   JSON: {"id":"..","num":"..",...}    (الويب)
 * يُشترط معرّف الشهادة (UUID غير قابل للتخمين) فلا يمكن استخراج أسماء بتجربة أرقام متسلسلة.
 * لا يُرجَع إلا ما هو مطبوع أصلًا على الشهادة.
 */
function verifyCertificate(code) {
  var id = '', num = '';
  var text = String(code || '').trim();
  if (!text || text.length > 600) return { valid: false, reason: 'رمز غير مقروء.' };
  if (text.charAt(0) === '{') {
    try {
      var o = JSON.parse(text);
      id = String(o.id || ''); num = String(o.num || '');
    } catch (e) { return { valid: false, reason: 'رمز غير صالح.' }; }
  } else if (text.indexOf('ZAD_CERT:') === 0) {
    var parts = text.split(':');
    id = parts[1] || ''; num = parts[2] || '';
  } else {
    return { valid: false, reason: 'هذا الرمز ليس شهادة صادرة من زاد الحلقات.' };
  }
  if (!id) return { valid: false, reason: 'رمز غير صالح.' };

  var cert = findById(getSheet(SHEETS.CERTIFICATES), id);
  if (!cert) return { valid: false, reason: 'لا توجد شهادة مطابقة لهذا الرمز في سجلاتنا.' };
  if (num && String(cert.certificateNumber) !== num) {
    return { valid: false, reason: 'رقم الشهادة لا يطابق السجل.' };
  }
  return {
    valid: true,
    certificate: {
      certificateNumber: String(cert.certificateNumber),
      studentName: String(cert.studentName),
      studentGender: String(cert.studentGender || ''),
      bookTitle: String(cert.bookTitle || DEFAULT_BOOK_TITLE),
      cycleName: String(cert.cycleName || ''),
      grade: (cert.grade === null || cert.grade === undefined) ? '' : String(cert.grade),
      progressPercent: Number(cert.progressPercent) || 0,
      issueDate: cert.issueDate ? formatDate(cert.issueDate) : ''
    }
  };
}

function getCertificates(studentId, session) {
  var sheet = getSheet(SHEETS.CERTIFICATES);
  var certs = sheetToObjects(sheet);
  var allowed = allowedStudentMap_(session);
  if (allowed) certs = certs.filter(function(c) { return allowed[c.studentId]; });
  if (studentId) {
    certs = certs.filter(function(c) { return c.studentId === studentId; });
  }
  return certs.map(function(c) {
    c.progressPercent = Number(c.progressPercent) || 0;
    c.bookId = c.bookId || DEFAULT_BOOK_ID;
    c.bookTitle = c.bookTitle || DEFAULT_BOOK_TITLE;
    c.grade = (c.grade === null || c.grade === undefined) ? '' : String(c.grade);
    delete c._row;
    return c;
  });
}

/** bookId اختياري (الافتراضي: الكتاب الأساسي) — الشهادة تخص كتابًا واحدًا. */
function issueCertificate(studentId, cycleId, session, bookId) {
  // المدير وحده يصدر الشهادة، وبعد أن يعتمد المشرف إنجاز الطالب في هذا الكتاب ويكتب التقدير.
  requireRole(session, ['admin']);
  bookId = bookId || DEFAULT_BOOK_ID;
  var book = getBookById_(bookId);
  if (booksSheetOrNull_() && !book) throw new Error('الكتاب غير موجود.');
  var bookTitle = book ? book.title : DEFAULT_BOOK_TITLE;

  var studentsSheet = getSheet(SHEETS.STUDENTS);
  var student = findById(studentsSheet, studentId);
  if (!student) throw new Error('الطالب غير موجود.');

  var cyclesSheet = getSheet(SHEETS.CYCLES);
  var cycle = findById(cyclesSheet, cycleId);
  if (!cycle) throw new Error('الدورة غير موجودة.');

  // التحقق من عدم إصدار شهادة مسبقة لنفس الطالب والدورة
  var certsSheet = getSheet(SHEETS.CERTIFICATES);
  var existing = sheetToObjects(certsSheet);
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].studentId === studentId && existing[i].cycleId === cycleId &&
        (existing[i].bookId || DEFAULT_BOOK_ID) === bookId) {
      throw new Error('تم إصدار شهادة لهذا الطالب في هذه الدورة لهذا الكتاب مسبقًا.');
    }
  }

  // لا شهادة بلا اعتماد المشرف (يُطبَّق متى كانت ميزة الاعتماد مفعّلة بعد setupBooks)
  var approval = null;
  if (achievementsSheetOrNull_()) {
    approval = findAchievement_(studentId, bookId);
    if (!approval) throw new Error('لم يعتمد المشرف إنجاز الطالب في هذا الكتاب بعد.');
  }

  // حساب نسبة الإنجاز لعناصر هذا الكتاب فقط
  var hadiths = getHadiths(bookId, null);
  var hadithIds = {};
  hadiths.forEach(function(h) { hadithIds[h.id] = true; });
  var progress = getProgress(studentId).filter(function(p) { return hadithIds[p.hadithId]; });
  var total = hadiths.length || HADITHS_COUNT;
  var memorized = progress.filter(function(p) { return p.memorized; }).length;
  var mediaDone = progress.filter(function(p) { return p.listened || p.watched; }).length;
  // حفظ 50% + سماع (صوت أو فيديو) 50% — الاطلاع على صورة الحديث مادة مساعدة لا تدخل النسبة
  var pct = Math.round((memorized / total) * 50 + (mediaDone / total) * 50);
  // الشهادة تحمل النسبة والتقدير كما اعتمدهما المشرف
  if (approval) pct = Number(approval.progressPercent) || pct;

  var certNumber = 'ZAD-' + new Date().getFullYear() + '-' + String(existing.length + 1).padStart(4, '0');
  var certId = uuid();
  var qrData = 'ZAD_CERT:' + certId + ':' + certNumber;

  var cert = {
    id: certId,
    certificateNumber: certNumber,
    studentId: studentId,
    studentName: student.name,
    cycleId: cycleId,
    cycleName: cycle.name,
    bookId: bookId,
    bookTitle: bookTitle,
    grade: approval ? String(approval.grade) : '',
    issueDate: formatDate(new Date()),
    progressPercent: pct,
    qrCode: qrData,
    // Carried over only if the Students sheet has a "gender" column;
    // otherwise stays empty and the certificate falls back to the
    // gender-neutral (both-forms) phrasing.
    studentGender: student.gender || ''
  };
  appendRow(certsSheet, cert);

  logOperation(session, 'إصدار شهادة', student.name + ' — ' + certNumber);
  return { success: true, certificate: cert };
}

/** المدير وحده يعدّل بيانات شهادة صادرة (التقدير، النسبة، الاسم، الكتاب، الدورة، الجنس، التاريخ). */
function updateCertificate(certificateId, data, session) {
  requireRole(session, ['admin']);
  data = data || {};
  var sheet = getSheet(SHEETS.CERTIFICATES);
  var cert = findById(sheet, certificateId);
  if (!cert) throw new Error('الشهادة غير موجودة.');

  var updates = {};
  if (data.grade !== undefined) {
    var g = String(data.grade).trim();
    if (g.length > 40) throw new Error('تقدير الدرجة طويل (الحد 40 حرفًا).');
    updates.grade = g;
  }
  if (data.progressPercent !== undefined) {
    var p = Number(data.progressPercent);
    if (isNaN(p) || p < 0 || p > 100) throw new Error('نسبة الإنجاز يجب أن تكون بين 0 و100.');
    updates.progressPercent = Math.round(p);
  }
  ['studentName', 'bookTitle', 'cycleName'].forEach(function(f) {
    if (data[f] !== undefined) {
      var v = String(data[f]).trim();
      if (!v) throw new Error('الحقل ' + f + ' لا يمكن أن يكون فارغًا.');
      updates[f] = v;
    }
  });
  if (data.studentGender !== undefined) {
    if (data.studentGender !== 'male' && data.studentGender !== 'female' && data.studentGender !== '') {
      throw new Error('قيمة الجنس غير صالحة.');
    }
    updates.studentGender = data.studentGender;
  }
  if (data.issueDate !== undefined) updates.issueDate = String(data.issueDate).split('T')[0];

  updateRow(sheet, certificateId, updates);
  logOperation(session, 'تعديل شهادة', cert.studentName + ' — ' + cert.certificateNumber);
  return { success: true };
}

function downloadCertificate(certificateId, session) {
  var sheet = getSheet(SHEETS.CERTIFICATES);
  var cert = findById(sheet, certificateId);
  if (!cert) throw new Error('الشهادة غير موجودة.');
  if (session && session.role === 'student' && cert.studentId !== session.userId) throw new Error('غير مصرح.');
  assertStudentAccess_(session, cert.studentId);
  delete cert._row;
  cert.progressPercent = Number(cert.progressPercent) || 0;
  cert.bookId = cert.bookId || DEFAULT_BOOK_ID;
  cert.bookTitle = cert.bookTitle || DEFAULT_BOOK_TITLE;
  cert.grade = (cert.grade === null || cert.grade === undefined) ? '' : String(cert.grade);
  return cert;
}
