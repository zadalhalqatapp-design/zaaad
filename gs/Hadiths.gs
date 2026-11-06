/**
 * إدارة الأحاديث والإنجاز والمقرر اليومي
 */

// ===== الأحاديث =====

/**
 * bookId اختياري: يُرجع عناصر كتاب واحد. بدونه:
 *  - الطالب يحصل على عناصر كتبه المعيَّنة فقط،
 *  - الإدارة والإشراف يحصلون على كل العناصر.
 * كل عنصر يحمل bookId دائمًا (الافتراضي للقديم).
 */
function getHadiths(bookId, session) {
  var sheet = getSheet(SHEETS.HADITHS);
  var hadiths = sheetToObjects(sheet);

  var allowed = null;
  if (bookId) {
    requireBookAccess_(session, bookId);
  } else if (session && session.role === 'student' && assignmentsSheetOrNull_()) {
    allowed = {};
    getAssignmentsRaw_().forEach(function(a) {
      if (a.studentId === session.userId) allowed[a.bookId] = true;
    });
  }

  hadiths = hadiths.filter(function(h) {
    var id = bookIdOfHadith_(h);
    if (bookId) return id === bookId;
    return !allowed || allowed[id];
  });
  hadiths.sort(function(a, b) { return Number(a.number) - Number(b.number); });
  return hadiths.map(function(h) {
    h.number = Number(h.number);
    h.bookId = bookIdOfHadith_(h);
    h._row = undefined;
    return h;
  });
}

function getHadith(hadithId) {
  var sheet = getSheet(SHEETS.HADITHS);
  return sanitizeHadith(findById(sheet, hadithId));
}

function addHadith(data, session) {
  requireRole(session, ['admin']);
  if (!data.text || !data.explanation) throw new Error('النص والشرح مطلوبان.');

  var sheet = getSheet(SHEETS.HADITHS);
  var bookId = data.bookId || DEFAULT_BOOK_ID;
  if (booksSheetOrNull_()) requireBook_(bookId);

  // الرقم الافتراضي: بعد أكبر رقم في نفس الكتاب
  var maxNumber = 0;
  sheetToObjects(sheet).forEach(function(h) {
    if (bookIdOfHadith_(h) === bookId && Number(h.number) > maxNumber) maxNumber = Number(h.number);
  });

  var hadith = {
    id: uuid(),
    bookId: bookId,
    number: Number(data.number) || (maxNumber + 1),
    text: data.text,
    explanation: data.explanation,
    youtubeUrl: data.youtubeUrl || '',
    audioUrl: data.audioUrl || '',
    pdfUrl: data.pdfUrl || '',
    category: data.category || '',
    narrator: data.narrator || ''
  };
  appendRow(sheet, hadith);
  logOperation(session, 'إضافة حديث', 'رقم ' + hadith.number);
  return { success: true };
}

function updateHadith(hadithId, data, session) {
  requireRole(session, ['admin']);
  var sheet = getSheet(SHEETS.HADITHS);
  var hadith = findById(sheet, hadithId);
  if (!hadith) throw new Error('الحديث غير موجود.');

  var updates = {};
  ['number', 'text', 'explanation', 'youtubeUrl', 'audioUrl', 'pdfUrl', 'category', 'narrator', 'bookId'].forEach(function(f) {
    if (data[f] !== undefined) updates[f] = data[f];
  });
  updateRow(sheet, hadithId, updates);
  logOperation(session, 'تعديل حديث', 'رقم ' + hadith.number);
  return { success: true };
}

function deleteHadith(hadithId, session) {
  requireRole(session, ['admin']);
  var sheet = getSheet(SHEETS.HADITHS);
  var hadith = findById(sheet, hadithId);
  if (!hadith) throw new Error('الحديث غير موجود.');

  deleteRowById(sheet, hadithId);
  logOperation(session, 'حذف حديث', 'رقم ' + hadith.number);
  return { success: true };
}

function sanitizeHadith(h) {
  if (!h) return null;
  delete h._row;
  if (h.number !== undefined) h.number = Number(h.number);
  return h;
}

// ===== الإنجاز =====

function getProgress(studentId) {
  var sheet = getSheet(SHEETS.PROGRESS);
  var all = sheetToObjects(sheet);
  return all.filter(function(p) { return p.studentId === studentId; }).map(function(p) {
    p.memorized = toBool(p.memorized);
    p.listened = toBool(p.listened);
    p.read = toBool(p.read);
    p.watched = toBool(p.watched);
    p.videoPercent = Number(p.videoPercent) || 0;
    p.videoPosition = Number(p.videoPosition) || 0;
    p.audioPercent = Number(p.audioPercent) || 0;
    p.audioPosition = Number(p.audioPosition) || 0;
    p.pdfPercent = Number(p.pdfPercent) || 0;
    p.pdfLastPage = Number(p.pdfLastPage) || 0;
    p.pdfTotalPages = Number(p.pdfTotalPages) || 0;
    delete p._row;
    return p;
  });
}

/**
 * حفظ نسبة مشاهدة/استماع الوسائط، واعتبارها مكتملة تلقائيًا عند تجاوز النسبة التي
 * يحددها المدير في الإعدادات. إنجاز "السماع" (50% من الدرجة) يتحقق بإكمال الفيديو
 * أو الصوت — أيهما أولًا؛ ليس شرطًا إكمالهما معًا.
 * mediaType: 'video' | 'audio' | 'pdf' ('pdf' لا يزال مدعومًا للتوافق مع نسخ قديمة؛
 * صورة الحديث الجديدة تُعلَّم "مُطَّلَع عليها" عبر saveProgress('read', true) البسيط).
 * data: { percent, position? } للفيديو والصوت — { percent, lastPage, totalPages } لملف PDF
 */
function saveMediaProgress(hadithId, mediaType, data, session) {
  requireRole(session, ['student']);
  if (['video', 'audio', 'pdf'].indexOf(mediaType) === -1) {
    throw new Error('نوع وسائط غير معروف.');
  }
  var studentId = session.userId;
  requireBookAccess_(session, bookIdOfHadith_(getHadith(hadithId)));
  var sheet = getSheet(SHEETS.PROGRESS);

  var rows = sheetToObjects(sheet);
  var existing = null;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].studentId === studentId && rows[i].hadithId === hadithId) {
      existing = rows[i];
      break;
    }
  }

  var settings = getSettings();
  var thresholdKey = mediaType + 'CompletionThreshold';
  var threshold = Number(settings[thresholdKey]) || 90;
  var percent = Math.max(0, Math.min(100, Number(data.percent) || 0));
  var completionField = mediaType === 'video' ? 'watched' : mediaType === 'audio' ? 'listened' : 'read';

  var updates = {};
  if (mediaType === 'video') {
    updates.videoPercent = percent;
    if (data.position !== undefined) updates.videoPosition = Math.round(Number(data.position) || 0);
  } else if (mediaType === 'audio') {
    updates.audioPercent = percent;
    if (data.position !== undefined) updates.audioPosition = Math.round(Number(data.position) || 0);
  } else {
    updates.pdfPercent = percent;
    if (data.lastPage !== undefined) updates.pdfLastPage = Math.round(Number(data.lastPage) || 0);
    if (data.totalPages !== undefined) updates.pdfTotalPages = Math.round(Number(data.totalPages) || 0);
  }

  var wasComplete = existing ? toBool(existing[completionField]) : false;
  var nowComplete = percent >= threshold || wasComplete;
  updates[completionField] = nowComplete;
  updates.updatedAt = new Date().toISOString();

  var watched = mediaType === 'video' ? nowComplete : existing ? toBool(existing.watched) : false;
  var listened = mediaType === 'audio' ? nowComplete : existing ? toBool(existing.listened) : false;
  // إنجاز السماع يتحقق بأي القناتين (صوت أو فيديو) — يطابق نسبة 50% حفظ + 50% سماع
  var mediaDone = watched || listened;

  if (existing) {
    if (!existing.startedAt) updates.startedAt = new Date().toISOString();
    if (mediaDone && !existing.completedAt) {
      updates.completedAt = new Date().toISOString();
    }
    updateRow(sheet, existing.id, updates);
  } else {
    var newRecord = {
      id: uuid(),
      studentId: studentId,
      hadithId: hadithId,
      memorized: false,
      listened: false,
      read: false,
      watched: false,
      videoPercent: 0,
      videoPosition: 0,
      audioPercent: 0,
      audioPosition: 0,
      pdfPercent: 0,
      pdfLastPage: 0,
      pdfTotalPages: 0,
      startedAt: new Date().toISOString(),
      completedAt: mediaDone ? new Date().toISOString() : '',
      updatedAt: new Date().toISOString()
    };
    for (var k in updates) newRecord[k] = updates[k];
    appendRow(sheet, newRecord);
  }

  return { success: true, completed: nowComplete, threshold: threshold };
}

function saveProgress(hadithId, field, value, session) {
  requireRole(session, ['student']);
  var studentId = session.userId;
  var sheet = getSheet(SHEETS.PROGRESS);

  // البحث عن سجل موجود
  var rows = sheetToObjects(sheet);
  var existing = null;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].studentId === studentId && rows[i].hadithId === hadithId) {
      existing = rows[i];
      break;
    }
  }

  if (existing) {
    var updates = {};
    updates[field] = value;
    updates.updatedAt = new Date().toISOString();
    updateRow(sheet, existing.id, updates);
  } else {
    var newRecord = {
      id: uuid(),
      studentId: studentId,
      hadithId: hadithId,
      memorized: field === 'memorized' ? value : false,
      listened: field === 'listened' ? value : false,
      read: field === 'read' ? value : false,
      updatedAt: new Date().toISOString()
    };
    appendRow(sheet, newRecord);
  }

  return { success: true };
}

/**
 * المشرف (لطلاب دورته) أو المدير يعدّل إنجاز طالب في حديث واحد نيابةً عنه — مثلًا حفظ شفهيًا أو سماع خارج التطبيق.
 * field = 'memorized' (الحفظ) أو 'media' (السماع: يضبط listened وwatched معًا). value = true/false.
 * إن كان للطالب اعتماد في كتاب الحديث ولم تصدر له شهادة فيه، تُحدَّث نسبة الاعتماد تلقائيًا
 * لتبقى مطابقة للإنجاز الجديد (الشهادة الصادرة لا تتغير — يعدّلها المدير).
 */
function setStudentProgress(studentId, hadithId, field, value, session) {
  requireRole(session, ['admin', 'supervisor']);
  assertStudentAccess_(session, studentId);
  if (field !== 'memorized' && field !== 'media') throw new Error('حقل الإنجاز غير صالح.');
  var student = findById(getSheet(SHEETS.STUDENTS), studentId);
  if (!student) throw new Error('الطالب غير موجود.');
  var hadith = findById(getSheet(SHEETS.HADITHS), hadithId);
  if (!hadith) throw new Error('الحديث غير موجود.');
  var v = toBool(value);
  var now = new Date().toISOString();

  var sheet = getSheet(SHEETS.PROGRESS);
  var existing = null;
  sheetToObjects(sheet).forEach(function(r) {
    if (r.studentId === studentId && r.hadithId === hadithId) existing = r;
  });

  var changes = field === 'memorized' ? { memorized: v } : { listened: v, watched: v };
  if (field === 'media') changes.completedAt = v ? ((existing && existing.completedAt) || now) : '';
  changes.updatedAt = now;
  if (existing) {
    updateRow(sheet, existing.id, changes);
  } else {
    var rec = { id: uuid(), studentId: studentId, hadithId: hadithId, memorized: false, listened: false,
                watched: false, read: false, startedAt: now };
    for (var k in changes) rec[k] = changes[k];
    appendRow(sheet, rec);
  }

  var bookId = bookIdOfHadith_(hadith);
  var ap = achievementsSheetOrNull_() ? findAchievement_(studentId, bookId) : null;
  if (ap) {
    var hasCert = sheetToObjects(getSheet(SHEETS.CERTIFICATES)).some(function(c) {
      return c.studentId === studentId && (c.bookId || DEFAULT_BOOK_ID) === bookId;
    });
    if (!hasCert) updateRow(getSheet(SHEETS.ACHIEVEMENTS), ap.id, { progressPercent: bookProgressPercent_(studentId, bookId) });
  }

  logOperation(session, 'تعديل إنجاز طالب', student.name + ' — حديث ' + hadith.number + ' — ' + (field === 'memorized' ? 'الحفظ' : 'السماع') + ': ' + (v ? 'نعم' : 'لا'));
  return { success: true };
}
// ===== المقرر اليومي =====

/**
 * مقرر اليوم لكتاب واحد (الافتراضي: الكتاب الأساسي).
 * عدد الأيام وعناصر اليوم يأتيان من إعدادات الكتاب، وبداية العدّ من تاريخ
 * تعيين الكتاب للطالب (وإلا من بداية الدورة النشطة).
 */
function getDailyLessons(session, bookId) {
  bookId = bookId || DEFAULT_BOOK_ID;
  requireBookAccess_(session, bookId);

  var book = getBookById_(bookId);
  var daysCount = book ? book.daysCount : PROGRAM_DAYS;
  var perDay = book ? book.itemsPerDay : HADITHS_PER_DAY;

  var hadiths = getHadiths(bookId, session);
  // بداية العدّ من دورة الطالب نفسه (قد تكون هناك عدة دورات نشطة)، وإلا أول دورة نشطة
  var cycle = (session && session.role === 'student') ? studentCycle_(session.userId) : null;
  if (!cycle) cycle = getActiveCycle();

  var startDate = cycle ? new Date(cycle.startDate) : new Date();
  if (session && session.role === 'student') {
    var assignment = findAssignment_(session.userId, bookId);
    if (assignment && assignment.startDate) startDate = new Date(assignment.startDate);
  }
  if (isNaN(startDate.getTime())) startDate = new Date();

  var today = new Date();
  var diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  var currentDay = Math.max(1, Math.min(diffDays + 1, daysCount));

  var startIdx = (currentDay - 1) * perDay;
  var dayHadiths = hadiths.slice(startIdx, startIdx + perDay);

  return {
    bookId: bookId,
    bookTitle: book ? book.title : DEFAULT_BOOK_TITLE,
    daysCount: daysCount,
    itemsPerDay: perDay,
    day: currentDay,
    date: formatDate(today),
    hadiths: dayHadiths
  };
}

function getActiveCycle() {
  var sheet = getSheet(SHEETS.CYCLES);
  var cycles = sheetToObjects(sheet);
  for (var i = 0; i < cycles.length; i++) {
    if (cycles[i].status === 'active') return cycles[i];
  }
  return null;
}
