/**
 * إدارة الدورات والشهادات
 */

// ===== الدورات =====

function getCycles() {
  var sheet = getSheet(SHEETS.CYCLES);
  return sheetToObjects(sheet).map(function(c) {
    c.studentIds = String(c.studentIds || '').split(',').filter(Boolean);
    delete c._row;
    return c;
  });
}

function startCycle(name, studentIds, session) {
  requireRole(session, ['admin']);
  if (!name || !name.trim()) throw new Error('اسم الدورة مطلوب.');

  var sheet = getSheet(SHEETS.CYCLES);

  // إنهاء أي دورة نشطة سابقة
  var cycles = sheetToObjects(sheet);
  cycles.forEach(function(c) {
    if (c.status === 'active') {
      updateRow(sheet, c.id, { status: 'completed' });
    }
  });

  var startDate = new Date();
  var endDate = new Date(startDate.getTime() + PROGRAM_DAYS * 24 * 60 * 60 * 1000);

  var cycle = {
    id: uuid(),
    name: name.trim(),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    status: 'active',
    studentIds: (studentIds || []).join(',')
  };
  appendRow(sheet, cycle);

  // ربط الطلاب بالدورة
  var studentsSheet = getSheet(SHEETS.STUDENTS);
  (studentIds || []).forEach(function(sid) {
    updateRow(studentsSheet, sid, { cycleId: cycle.id });
  });

  logOperation(session, 'بدء دورة', name);
  return { success: true, cycleId: cycle.id };
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

// ===== الشهادات =====

function getCertificates(studentId) {
  var sheet = getSheet(SHEETS.CERTIFICATES);
  var certs = sheetToObjects(sheet);
  if (studentId) {
    certs = certs.filter(function(c) { return c.studentId === studentId; });
  }
  return certs.map(function(c) {
    c.progressPercent = Number(c.progressPercent) || 0;
    delete c._row;
    return c;
  });
}

function issueCertificate(studentId, cycleId, session) {
  requireRole(session, ['admin', 'supervisor']);

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
    if (existing[i].studentId === studentId && existing[i].cycleId === cycleId) {
      throw new Error('تم إصدار شهادة لهذا الطالب في هذه الدورة مسبقًا.');
    }
  }

  // حساب نسبة الإنجاز
  var progress = getProgress(studentId);
  var hadiths = getHadiths();
  var total = hadiths.length || HADITHS_COUNT;
  var memorized = progress.filter(function(p) { return p.memorized; }).length;
  var listened = progress.filter(function(p) { return p.listened; }).length;
  var read = progress.filter(function(p) { return p.read; }).length;
  var pct = Math.round((memorized / total) * 50 + (listened / total) * 25 + (read / total) * 25);

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

function downloadCertificate(certificateId) {
  var sheet = getSheet(SHEETS.CERTIFICATES);
  var cert = findById(sheet, certificateId);
  if (!cert) throw new Error('الشهادة غير موجودة.');
  delete cert._row;
  cert.progressPercent = Number(cert.progressPercent) || 0;
  return cert;
}
