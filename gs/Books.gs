/**
 * الكتب المتعددة للحفظ
 * ---------------------
 * كل كتاب له عدد أيام وعدد عناصر يوميًا يحدده المدير، والمشرف يعيّن كتبًا لطلاب محددين.
 * الأحاديث القديمة كلها تنتمي إلى الكتاب الأساسي (DEFAULT_BOOK_ID) — الحديث بلا bookId
 * يُعامَل كأنه من الكتاب الأساسي، لذا يبقى أي عميل قديم يعمل كما هو.
 *
 * الترحيل (مرة واحدة): شغّل الدالة setupBooks() يدويًا من محرر Apps Script.
 * لا تشغّل setupSheets() لهذا الغرض (تعيد إنشاء حساب المدير الافتراضي).
 */

// ===== أدوات داخلية =====

function bookIdOfHadith_(h) {
  return h && h.bookId ? String(h.bookId) : DEFAULT_BOOK_ID;
}

function clampInt_(value, min, max, fallback) {
  var n = Math.round(Number(value));
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeBook_(b) {
  delete b._row;
  b.daysCount = Number(b.daysCount) || PROGRAM_DAYS;
  b.itemsPerDay = Number(b.itemsPerDay) || HADITHS_PER_DAY;
  b.autoAssign = toBool(b.autoAssign);
  b.order = Number(b.order) || 0;
  b.status = b.status || 'active';
  return b;
}

function booksSheetOrNull_() {
  return getSpreadsheet().getSheetByName(SHEETS.BOOKS);
}

function assignmentsSheetOrNull_() {
  return getSpreadsheet().getSheetByName(SHEETS.BOOK_ASSIGNMENTS);
}

function getAllBooks_() {
  var sheet = booksSheetOrNull_();
  if (!sheet) return [];
  var books = sheetToObjects(sheet).map(normalizeBook_);
  books.sort(function(a, b) {
    if (a.order !== b.order) return a.order - b.order;
    return String(a.createdAt).localeCompare(String(b.createdAt));
  });
  return books;
}

/** يرجع الكتاب أو null (يتسامح مع عدم تشغيل الترحيل بعد). */
function getBookById_(bookId) {
  var books = getAllBooks_();
  for (var i = 0; i < books.length; i++) {
    if (books[i].id === bookId) return books[i];
  }
  return null;
}

function requireBook_(bookId) {
  var book = getBookById_(bookId);
  if (!book) throw new Error('الكتاب غير موجود.');
  return book;
}

function getAssignmentsRaw_() {
  var sheet = assignmentsSheetOrNull_();
  if (!sheet) return [];
  return sheetToObjects(sheet);
}

function findAssignment_(studentId, bookId) {
  var rows = getAssignmentsRaw_();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].studentId === studentId && rows[i].bookId === bookId) return rows[i];
  }
  return null;
}

/** الطالب لا يصل إلا إلى كتبه المعيَّنة؛ الإدارة والإشراف يصلان لكل الكتب. */
function requireBookAccess_(session, bookId) {
  if (!session || session.role !== 'student') return;
  if (!assignmentsSheetOrNull_()) return; // قبل تشغيل setupBooks: السلوك القديم
  if (!findAssignment_(session.userId, bookId)) {
    var e = new Error('هذا الكتاب غير معيَّن لك.');
    e.code = 'FORBIDDEN';
    throw e;
  }
}

function parseStartDate_(value) {
  if (value) {
    var d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function addAssignment_(studentId, bookId, startDate, session) {
  var sheet = getSheet(SHEETS.BOOK_ASSIGNMENTS);
  appendRow(sheet, {
    id: uuid(),
    studentId: studentId,
    bookId: bookId,
    startDate: parseStartDate_(startDate),
    assignedBy: session ? (session.name || '') : 'النظام',
    assignedAt: new Date().toISOString()
  });
}

/** يعيّن تلقائيًا الكتب المُعلَّمة autoAssign للطالب المعتمَد حديثًا. */
function autoAssignBooksToStudent_(studentId) {
  if (!assignmentsSheetOrNull_() || !booksSheetOrNull_()) return;
  getAllBooks_().forEach(function(book) {
    if (book.autoAssign && book.status === 'active' && !findAssignment_(studentId, book.id)) {
      addAssignment_(studentId, book.id, null, null);
    }
  });
}

function removeAssignmentsWhere_(predicate) {
  var sheet = assignmentsSheetOrNull_();
  if (!sheet) return 0;
  var rows = sheetToObjects(sheet);
  var removed = 0;
  // من الأسفل للأعلى حتى لا تتحرك أرقام الصفوف
  for (var i = rows.length - 1; i >= 0; i--) {
    if (predicate(rows[i])) {
      sheet.deleteRow(rows[i]._row);
      removed++;
    }
  }
  return removed;
}

// ===== الكتب =====

/**
 * المدير/المشرف: كل الكتب مع عدد العناصر وعدد الطلاب المعيَّنين.
 * الطالب: كتبه المعيَّنة فقط (النشطة) مع تاريخ بدايته.
 */
function getBooks(session) {
  var books = getAllBooks_();
  var hadiths = sheetToObjects(getSheet(SHEETS.HADITHS));
  var counts = {};
  hadiths.forEach(function(h) {
    var id = bookIdOfHadith_(h);
    counts[id] = (counts[id] || 0) + 1;
  });
  var assignments = getAssignmentsRaw_();

  if (session && session.role === 'student') {
    var mine = {};
    assignments.forEach(function(a) {
      if (a.studentId === session.userId) mine[a.bookId] = a;
    });
    return books
      .filter(function(b) { return mine[b.id] && b.status === 'active'; })
      .map(function(b) {
        b.itemsCount = counts[b.id] || 0;
        b.startDate = mine[b.id].startDate;
        return b;
      });
  }

  var assignedCount = {};
  assignments.forEach(function(a) {
    assignedCount[a.bookId] = (assignedCount[a.bookId] || 0) + 1;
  });
  return books.map(function(b) {
    b.itemsCount = counts[b.id] || 0;
    b.assignedCount = assignedCount[b.id] || 0;
    return b;
  });
}

function addBook(data, session) {
  requireRole(session, ['admin']);
  var title = String((data && data.title) || '').trim();
  if (!title) throw new Error('عنوان الكتاب مطلوب.');

  var books = getAllBooks_();
  var maxOrder = 0;
  books.forEach(function(b) { if (b.order > maxOrder) maxOrder = b.order; });

  var book = {
    id: uuid(),
    title: title,
    description: String(data.description || ''),
    daysCount: clampInt_(data.daysCount, 1, 365, PROGRAM_DAYS),
    itemsPerDay: clampInt_(data.itemsPerDay, 1, 50, HADITHS_PER_DAY),
    autoAssign: !!data.autoAssign,
    status: 'active',
    order: maxOrder + 1,
    createdAt: new Date().toISOString()
  };
  appendRow(getSheet(SHEETS.BOOKS), book);
  logOperation(session, 'إضافة كتاب', title);
  return { success: true, bookId: book.id };
}

function updateBook(bookId, data, session) {
  requireRole(session, ['admin']);
  var book = requireBook_(bookId);
  var updates = {};
  if (data.title !== undefined) {
    var t = String(data.title).trim();
    if (!t) throw new Error('عنوان الكتاب مطلوب.');
    updates.title = t;
  }
  if (data.description !== undefined) updates.description = String(data.description);
  if (data.daysCount !== undefined) updates.daysCount = clampInt_(data.daysCount, 1, 365, book.daysCount);
  if (data.itemsPerDay !== undefined) updates.itemsPerDay = clampInt_(data.itemsPerDay, 1, 50, book.itemsPerDay);
  if (data.autoAssign !== undefined) updates.autoAssign = !!data.autoAssign;
  if (data.status !== undefined) updates.status = data.status === 'archived' ? 'archived' : 'active';
  if (data.order !== undefined) updates.order = clampInt_(data.order, 0, 9999, book.order);

  updateRow(getSheet(SHEETS.BOOKS), bookId, updates);
  logOperation(session, 'تعديل كتاب', updates.title || book.title);
  return { success: true };
}

function deleteBook(bookId, session) {
  requireRole(session, ['admin']);
  var book = requireBook_(bookId);
  if (bookId === DEFAULT_BOOK_ID) throw new Error('لا يمكن حذف الكتاب الأساسي (يمكنك تعديل اسمه).');

  var hadiths = sheetToObjects(getSheet(SHEETS.HADITHS));
  for (var i = 0; i < hadiths.length; i++) {
    if (bookIdOfHadith_(hadiths[i]) === bookId) {
      throw new Error('لا يمكن حذف كتاب يحتوي على عناصر. احذف عناصره أولًا.');
    }
  }
  removeAssignmentsWhere_(function(a) { return a.bookId === bookId; });
  deleteRowById(getSheet(SHEETS.BOOKS), bookId);
  logOperation(session, 'حذف كتاب', book.title);
  return { success: true };
}

// ===== التعيينات =====

/** كل التعيينات (اختياريًا لطالب واحد) — للإدارة والإشراف. */
function getBookAssignments(studentId, session) {
  requireRole(session, ['admin', 'supervisor']);
  var allowed = allowedStudentMap_(session);
  return getAssignmentsRaw_()
    .filter(function(a) { return !allowed || allowed[a.studentId]; })
    .filter(function(a) { return !studentId || a.studentId === studentId; })
    .map(function(a) { delete a._row; return a; });
}

/** يضبط كتب طالب واحد بالضبط: يضيف الناقص ويزيل غير المحدَّد (تقدّمه المحفوظ لا يُمسّ). */
function setStudentBooks(studentId, bookIds, session) {
  requireRole(session, ['admin', 'supervisor']);
  assertStudentAccess_(session, studentId);
  var student = findById(getSheet(SHEETS.STUDENTS), studentId);
  if (!student) throw new Error('الطالب غير موجود.');

  var wanted = {};
  (bookIds || []).forEach(function(id) {
    requireBook_(id);
    wanted[id] = true;
  });

  var current = {};
  getAssignmentsRaw_().forEach(function(a) {
    if (a.studentId === studentId) current[a.bookId] = a;
  });

  var added = 0;
  Object.keys(wanted).forEach(function(id) {
    if (!current[id]) { addAssignment_(studentId, id, null, session); added++; }
  });
  var removed = removeAssignmentsWhere_(function(a) {
    return a.studentId === studentId && !wanted[a.bookId];
  });

  logOperation(session, 'تعيين كتب لطالب', student.name + ' (+' + added + ' / -' + removed + ')');
  return { success: true };
}

/** يعدّل تعيين كتاب واحد لعدة طلاب: addIds تُضاف (بتاريخ بدء اختياري) وremoveIds تُزال. */
function updateBookAssignments(bookId, addIds, removeIds, startDate, session) {
  requireRole(session, ['admin', 'supervisor']);
  var book = requireBook_(bookId);

  // المشرف لا يمسّ إلا طلاب دوراته
  var allowed = allowedStudentMap_(session);
  var add = {};
  (addIds || []).forEach(function(id) { if (!allowed || allowed[id]) add[id] = true; });
  var remove = {};
  (removeIds || []).forEach(function(id) { if (!allowed || allowed[id]) remove[id] = true; });

  var already = {};
  getAssignmentsRaw_().forEach(function(a) {
    if (a.bookId === bookId) already[a.studentId] = true;
  });

  var studentIds = {};
  sheetToObjects(getSheet(SHEETS.STUDENTS)).forEach(function(s) { studentIds[s.id] = true; });

  var added = 0;
  Object.keys(add).forEach(function(sid) {
    if (studentIds[sid] && !already[sid]) { addAssignment_(sid, bookId, startDate, session); added++; }
  });
  var removed = removeAssignmentsWhere_(function(a) {
    return a.bookId === bookId && remove[a.studentId];
  });

  logOperation(session, 'تعيين كتاب لطلاب', book.title + ' (+' + added + ' / -' + removed + ')');
  return { success: true, added: added, removed: removed };
}

// ===== اعتماد الإنجاز وتقدير الدرجة =====
// المشرف يعتمد إنجاز الطالب في كتاب ويكتب التقدير، والمدير وحده يصدر الشهادة بناءً على هذا الاعتماد.

function achievementsSheetOrNull_() {
  return getSpreadsheet().getSheetByName(SHEETS.ACHIEVEMENTS);
}

function getAchievementsRaw_() {
  var sheet = achievementsSheetOrNull_();
  if (!sheet) return [];
  return sheetToObjects(sheet);
}

function findAchievement_(studentId, bookId) {
  var rows = getAchievementsRaw_();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].studentId === studentId && (rows[i].bookId || DEFAULT_BOOK_ID) === bookId) return rows[i];
  }
  return null;
}

function normalizeAchievement_(a) {
  delete a._row;
  a.bookId = a.bookId || DEFAULT_BOOK_ID;
  a.progressPercent = Number(a.progressPercent) || 0;
  a.notes = a.notes || '';
  // Sheets يحوّل «95» إلى رقم؛ نعيد التقدير نصًا دائمًا
  a.grade = (a.grade === null || a.grade === undefined) ? '' : String(a.grade);
  return a;
}

/**
 * نسبة إنجاز الطالب في كتاب: حفظ 50% + سماع (صوت أو فيديو، أيهما تم) 50% من عناصر
 * الكتاب فقط. الاطلاع على صورة الحديث (read) لا يدخل في النسبة — مادة مساعدة فقط.
 */
function bookProgressPercent_(studentId, bookId) {
  var hadiths = getHadiths(bookId, null);
  var ids = {};
  hadiths.forEach(function(h) { ids[h.id] = true; });
  var progress = getProgress(studentId).filter(function(p) { return ids[p.hadithId]; });
  var total = hadiths.length || HADITHS_COUNT;
  var memorized = progress.filter(function(p) { return p.memorized; }).length;
  var mediaDone = progress.filter(function(p) { return p.listened || p.watched; }).length;
  return Math.round((memorized / total) * 50 + (mediaDone / total) * 50);
}

/**
 * المدير/المشرف: كل الاعتمادات (أو لطالب/كتاب). الطالب: اعتماداته هو فقط.
 */
function getAchievements(studentId, bookId, session) {
  var sid = studentId;
  if (session && session.role === 'student') sid = session.userId;
  else requireRole(session, ['admin', 'supervisor']);
  var allowed = allowedStudentMap_(session);
  if (allowed && sid) assertStudentAccess_(session, sid);
  return getAchievementsRaw_()
    .filter(function(a) {
      if (allowed && !allowed[a.studentId]) return false;
      return (!sid || a.studentId === sid) && (!bookId || (a.bookId || DEFAULT_BOOK_ID) === bookId);
    })
    .map(normalizeAchievement_);
}

/** يعتمد الإنجاز أو يعدّل تقديره (حتى بعد صدور الشهادة). */
function approveAchievement(studentId, bookId, grade, notes, session) {
  requireRole(session, ['supervisor', 'admin']);
  assertStudentAccess_(session, studentId);
  bookId = bookId || DEFAULT_BOOK_ID;
  var student = findById(getSheet(SHEETS.STUDENTS), studentId);
  if (!student) throw new Error('الطالب غير موجود.');
  var book = getBookById_(bookId);
  if (booksSheetOrNull_() && !book) throw new Error('الكتاب غير موجود.');
  if (assignmentsSheetOrNull_() && !findAssignment_(studentId, bookId)) {
    throw new Error('هذا الكتاب غير معيَّن لهذا الطالب.');
  }
  var g = String(grade || '').trim();
  if (!g) throw new Error('تقدير الدرجة مطلوب.');
  if (g.length > 40) throw new Error('تقدير الدرجة طويل (الحد 40 حرفًا).');
  if (!achievementsSheetOrNull_()) throw new Error('شغّل setupBooks() في Apps Script أولًا.');

  // تعديل الاعتماد مسموح حتى بعد صدور الشهادة (للمشرف والمدير). الشهادة الصادرة لا تتغير
  // تلقائيًا — يعدّلها المدير وحده عبر updateCertificate.
  var pct = bookProgressPercent_(studentId, bookId);
  var sheet = getSheet(SHEETS.ACHIEVEMENTS);
  var existing = findAchievement_(studentId, bookId);
  var data = {
    grade: g,
    notes: String(notes || '').trim(),
    progressPercent: pct,
    approvedBy: session.name || '',
    approvedById: session.userId || '',
    approvedAt: new Date().toISOString()
  };
  if (existing) {
    updateRow(sheet, existing.id, data);
  } else {
    data.id = uuid();
    data.studentId = studentId;
    data.bookId = bookId;
    appendRow(sheet, data);
  }
  logOperation(session, 'اعتماد إنجاز', student.name + ' — ' + (book ? book.title : DEFAULT_BOOK_TITLE) + ' — ' + g);
  return { success: true, progressPercent: pct };
}

/**
 * اعتماد جماعي: items = [{studentId, grade, notes?}] لكتاب واحد. كل عنصر يمر على نفس فحوصات
 * approveAchievement (دور المشرف/المدير، نطاق الدورة، تعيين الكتاب، طول التقدير)، ويُرجَع
 * لكل طالب نتيجته منفردة فلا يُلغي فشلُ طالبٍ اعتمادَ البقية. الحد الأقصى 200 عنصر للطلب.
 */
function approveAchievementsBulk(bookId, items, session) {
  requireRole(session, ['supervisor', 'admin']);
  if (!items || !items.length) throw new Error('لا توجد عناصر للاعتماد.');
  if (items.length > 200) throw new Error('الحد الأقصى 200 طالب في الطلب الواحد.');
  var results = [];
  var okCount = 0;
  items.forEach(function(it) {
    var sid = it && it.studentId ? String(it.studentId) : '';
    try {
      if (!sid) throw new Error('معرّف الطالب مفقود.');
      var r = approveAchievement(sid, bookId, it.grade, it.notes, session);
      results.push({ studentId: sid, ok: true, progressPercent: r.progressPercent });
      okCount++;
    } catch (e) {
      results.push({ studentId: sid, ok: false, error: e && e.message ? e.message : 'فشل الاعتماد.' });
    }
  });
  return { success: okCount > 0, total: items.length, approved: okCount, failed: items.length - okCount, results: results };
}

/** يلغي الاعتماد (ما لم تصدر شهادة). */
function revokeAchievement(studentId, bookId, session) {
  requireRole(session, ['supervisor', 'admin']);
  assertStudentAccess_(session, studentId);
  bookId = bookId || DEFAULT_BOOK_ID;
  var existing = findAchievement_(studentId, bookId);
  if (!existing) throw new Error('لا يوجد اعتماد لإلغائه.');
  var certs = sheetToObjects(getSheet(SHEETS.CERTIFICATES));
  for (var i = 0; i < certs.length; i++) {
    if (certs[i].studentId === studentId && (certs[i].bookId || DEFAULT_BOOK_ID) === bookId) {
      throw new Error('صدرت شهادة لهذا الكتاب بالفعل، لا يمكن إلغاء الاعتماد.');
    }
  }
  deleteRowById(getSheet(SHEETS.ACHIEVEMENTS), existing.id);
  logOperation(session, 'إلغاء اعتماد إنجاز', studentId);
  return { success: true };
}

// ===== حزم مُجمَّعة لتقليل عدد الطلبات =====
// كل طلب واحد لـ Apps Script له كلفة زمنية شبه ثابتة (زمن تشغيل السكربت + الشبكة) بصرف
// النظر عن حجم البيانات المطلوبة، فتجميع عدة عمليات قراءة مستقلة في استدعاء واحد يخفّض
// زمن استجابة التطبيق الفعلي أكثر بكثير من أي تصغير لحجم البيانات نفسها. هذه الدوال لا
// تضيف منطقًا جديدًا — فقط تستدعي الدوال الموجودة وتُرجعها معًا. عملاء لا يعرفون هذه
// الإجراءات (تطبيق لم يُحدَّث بعد) يستمرون بالعمل عبر الاستدعاءات المنفصلة القديمة.

/**
 * كشف إنجاز الطلاب لكتاب واحد في طلب واحد (بدل طلب لكل طالب): الاسم + نسبة الإنجاز + تقدير الاعتماد.
 * المدير يرى كل الطلاب المعتمدين المعيَّن لهم الكتاب؛ المشرف طلاب دورته فقط. النسبة نفس معادلة
 * bookProgressPercent_ (حفظ 50% + سماع صوت/فيديو 50%) لكن تُحسب لكل الطلاب بقراءة واحدة للإنجاز.
 */
function getAchievementsRoster(bookId, session) {
  requireRole(session, ['admin', 'supervisor']);
  var books = getBooks(session);
  var book = null;
  if (bookId) book = books.filter(function(b) { return b.id === bookId; })[0] || null;
  if (!book) book = books[0] || null;
  var resolvedId = book ? book.id : DEFAULT_BOOK_ID;

  var hadiths = getHadiths(book ? book.id : null, session);
  var hadithIds = {};
  hadiths.forEach(function(h) { hadithIds[h.id] = true; });
  var total = hadiths.length || HADITHS_COUNT;

  var counts = {};
  sheetToObjects(getSheet(SHEETS.PROGRESS)).forEach(function(p) {
    if (!hadithIds[p.hadithId]) return;
    var c = counts[p.studentId] || (counts[p.studentId] = { m: 0, d: 0 });
    if (toBool(p.memorized)) c.m++;
    if (toBool(p.listened) || toBool(p.watched)) c.d++;
  });

  var assigned = null;
  if (assignmentsSheetOrNull_() && book) {
    assigned = {};
    getAssignmentsRaw_().forEach(function(a) { if (a.bookId === book.id) assigned[a.studentId] = true; });
  }
  var approvals = {};
  getAchievementsRaw_().forEach(function(a) {
    if ((a.bookId || DEFAULT_BOOK_ID) === resolvedId) approvals[a.studentId] = normalizeAchievement_(a);
  });
  var certified = {};
  sheetToObjects(getSheet(SHEETS.CERTIFICATES)).forEach(function(c) {
    if ((c.bookId || DEFAULT_BOOK_ID) === resolvedId) certified[c.studentId] = true;
  });

  var allowed = allowedStudentMap_(session);
  var cycles = sheetToObjects(getSheet(SHEETS.CYCLES));
  var cycleName = {};
  cycles.forEach(function(c) { cycleName[c.id] = c.name; });

  var rows = [];
  sheetToObjects(getSheet(SHEETS.STUDENTS)).forEach(function(s) {
    if (s.status !== 'approved') return;
    if (allowed && !allowed[s.id]) return;
    if (assigned && !assigned[s.id]) return;
    var c = counts[s.id] || { m: 0, d: 0 };
    var ap = approvals[s.id] || null;
    var cid = resolveStudentCycleId_(s, cycles);
    rows.push({
      studentId: s.id,
      name: s.name,
      email: s.email,
      cycleId: cid,
      cycleName: cid ? (cycleName[cid] || '') : '',
      memorized: c.m,
      mediaDone: c.d,
      progressPercent: Math.round((c.m / total) * 50 + (c.d / total) * 50),
      approved: !!ap,
      grade: ap ? ap.grade : '',
      notes: ap ? ap.notes : '',
      approvedBy: ap ? ap.approvedBy : '',
      certIssued: !!certified[s.id]
    });
  });
  rows.sort(function(a, b) { return String(a.name).localeCompare(String(b.name), 'ar'); });

  return {
    books: books,
    book: book,
    total: total,
    approvalSupported: !!achievementsSheetOrNull_(),
    rows: rows
  };
}
/** شاشات الطالب الرئيسية (اللوحة/المقرر اليومي/الأحاديث/إنجازي) في طلب واحد بدل 3-4. */
function getStudentHome(bookId, session) {
  requireRole(session, ['student']);
  var books = getBooks(session);
  var book = null;
  if (bookId) book = books.filter(function(b) { return b.id === bookId; })[0] || null;
  if (!book) book = books[0] || null;
  var resolvedId = book ? book.id : (bookId || null);
  return {
    books: books,
    book: book,
    hadiths: getHadiths(resolvedId, session),
    progress: getProgress(session.userId),
    daily: getDailyLessons(session, resolvedId)
  };
}

/** شاشة «إصدار الشهادات» عند المدير: كل ما تحتاجه في طلب واحد بدل ستة. */
function getIssueCertificateContext(session) {
  requireRole(session, ['admin']);
  return {
    students: getStudents(session),
    certificates: getCertificates(null, session),
    cycles: getCycles(session),
    books: getBooks(session),
    assignments: getBookAssignments(null, session),
    achievements: achievementsSheetOrNull_() ? getAchievements(null, null, session) : null
  };
}

/** شاشة «إنجاز الطلاب» عند المشرف/المدير لطالب واحد: كتبه المعيَّنة + كتابه المختار + أحاديثه + إنجازه + اعتماده. */
function getStudentProgressContext(studentId, bookId, session) {
  requireRole(session, ['admin', 'supervisor']);
  assertStudentAccess_(session, studentId);
  var student = findById(getSheet(SHEETS.STUDENTS), studentId);
  if (!student) throw new Error('الطالب غير موجود.');

  var all = getBooks(session);
  var assignedIds = {};
  getAssignmentsRaw_().forEach(function(a) {
    if (a.studentId === studentId) assignedIds[a.bookId] = true;
  });
  var books = all.filter(function(b) { return assignedIds[b.id]; });
  if (books.length === 0) books = all;

  var book = null;
  if (bookId) book = books.filter(function(b) { return b.id === bookId; })[0] || null;
  if (!book) book = books[0] || null;
  var resolvedId = book ? book.id : null;
  // للاعتماد نحتاج مطابقة دقيقة لكتاب واحد (الكتاب الأساسي إن لم توجد كتب بعد)
  var achievementBookId = resolvedId || DEFAULT_BOOK_ID;

  return {
    books: books,
    book: book,
    hadiths: getHadiths(resolvedId, session),
    progress: getProgress(studentId),
    // مصفوفة بعنصر واحد على الأكثر (مطابقة للكتاب المختار بالضبط)، أو null إن لم يُشغَّل setupBooks() بعد
    achievements: achievementsSheetOrNull_() ? getAchievements(studentId, achievementBookId, session) : null
  };
}

// ===== الترحيل (يُشغَّل يدويًا مرة واحدة، ويمكن إعادة تشغيله بأمان) =====

function ensureSheetWithHeaders_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastColumn() < 1 || String(sheet.getRange(1, 1).getValue()) === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1f664f').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11);
  }
  sheet.setFrozenRows(1);
  return sheet;
}

/** يضيف أعمدة ناقصة في آخر رأس الورقة دون المساس بالأعمدة الموجودة. */
function ensureColumns_(sheet, names) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  var added = [];
  names.forEach(function(name) {
    if (headers.indexOf(name) === -1) {
      lastCol++;
      sheet.getRange(1, lastCol).setValue(name)
        .setBackground('#1f664f').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11);
      headers.push(name);
      added.push(name);
    }
  });
  return added;
}

function setupBooks() {
  var ss = getSpreadsheet();
  var report = [];

  ensureSheetWithHeaders_(ss, SHEETS.BOOKS, SHEET_HEADERS[SHEETS.BOOKS]);
  ensureSheetWithHeaders_(ss, SHEETS.BOOK_ASSIGNMENTS, SHEET_HEADERS[SHEETS.BOOK_ASSIGNMENTS]);
  ensureSheetWithHeaders_(ss, SHEETS.ACHIEVEMENTS, SHEET_HEADERS[SHEETS.ACHIEVEMENTS]);

  var hadithsSheet = getSheet(SHEETS.HADITHS);
  var addedH = ensureColumns_(hadithsSheet, ['bookId']);
  if (addedH.length) report.push('عمود bookId أُضيف إلى الأحاديث');
  var addedC = ensureColumns_(getSheet(SHEETS.CERTIFICATES), ['bookId', 'bookTitle', 'grade', 'studentGender']);
  if (addedC.length) report.push('أعمدة ' + addedC.join(', ') + ' أُضيفت إلى الشهادات');
  var addedS = ensureColumns_(getSheet(SHEETS.STUDENTS), ['gender']);
  if (addedS.length) report.push('عمود gender (الجنس) أُضيف إلى الطلاب');
  var addedSup = ensureColumns_(getSheet(SHEETS.SUPERVISORS), ['cycleIds']);
  if (addedSup.length) report.push('عمود cycleIds (دورات المشرف) أُضيف إلى المشرفين');
  var addedR = ensureColumns_(getSheet(SHEETS.REGISTRATION_REQUESTS), ['gender']);
  if (addedR.length) report.push('عمود gender أُضيف إلى طلبات التسجيل');

  // الكتاب الأساسي
  if (!getBookById_(DEFAULT_BOOK_ID)) {
    appendRow(getSheet(SHEETS.BOOKS), {
      id: DEFAULT_BOOK_ID,
      title: DEFAULT_BOOK_TITLE,
      description: 'الكتاب الأساسي — يضم كل الأحاديث الموجودة قبل تفعيل الكتب المتعددة.',
      daysCount: PROGRAM_DAYS,
      itemsPerDay: HADITHS_PER_DAY,
      autoAssign: true,
      status: 'active',
      order: 1,
      createdAt: new Date().toISOString()
    });
    report.push('أُنشئ الكتاب الأساسي "' + DEFAULT_BOOK_TITLE + '"');
  }

  // أي حديث بلا bookId ينتمي للكتاب الأساسي
  var hadiths = sheetToObjects(hadithsSheet);
  var headers = hadithsSheet.getRange(1, 1, 1, hadithsSheet.getLastColumn()).getValues()[0];
  var colIdx = headers.indexOf('bookId') + 1;
  var fixed = 0;
  hadiths.forEach(function(h) {
    if (!h.bookId) {
      hadithsSheet.getRange(h._row, colIdx).setValue(DEFAULT_BOOK_ID);
      fixed++;
    }
  });
  if (fixed) report.push('نُسبت ' + fixed + ' أحاديث إلى الكتاب الأساسي');

  // مزامنة دورة الطالب: من كان في studentIds دورة بلا عمود cycleId يُثبَّت له (بيانات ما قبل إسناد الدورات)
  var cyclesAll = sheetToObjects(getSheet(SHEETS.CYCLES));
  var studentsSheetSync = getSheet(SHEETS.STUDENTS);
  var synced = 0;
  sheetToObjects(studentsSheetSync).forEach(function(s) {
    if (s.cycleId) return;
    var cid = resolveStudentCycleId_(s, cyclesAll);
    if (cid) { updateRow(studentsSheetSync, s.id, { cycleId: cid }); synced++; }
  });
  if (synced) report.push('ثُبّتت دورة ' + synced + ' طالبًا');

  // الطلاب الحاليون (المعتمدون/الموقوفون) يحصلون على الكتاب الأساسي بتاريخ بدء الدورة النشطة
  var cycle = getActiveCycle();
  var assigned = {};
  getAssignmentsRaw_().forEach(function(a) { assigned[a.studentId + '|' + a.bookId] = true; });
  var assignedNow = 0;
  sheetToObjects(getSheet(SHEETS.STUDENTS)).forEach(function(s) {
    if (s.status !== 'approved' && s.status !== 'suspended') return;
    if (assigned[s.id + '|' + DEFAULT_BOOK_ID]) return;
    var start = cycle && cycle.startDate ? cycle.startDate : (s.approvedAt || null);
    addAssignment_(s.id, DEFAULT_BOOK_ID, start, null);
    assignedNow++;
  });
  if (assignedNow) report.push('عُيّن الكتاب الأساسي لـ ' + assignedNow + ' طالبًا');

  var msg = report.length ? report.join(' — ') : 'لا شيء لترحيله: كل شيء مُهيَّأ مسبقًا.';
  try { ss.toast(msg, 'الكتب المتعددة'); } catch (e) { /* لا يهم */ }
  Logger.log(msg);
  return msg;
}
