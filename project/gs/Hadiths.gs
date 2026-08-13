/**
 * إدارة الأحاديث والإنجاز والمقرر اليومي
 */

// ===== الأحاديث =====

function getHadiths() {
  var sheet = getSheet(SHEETS.HADITHS);
  var hadiths = sheetToObjects(sheet);
  hadiths.sort(function(a, b) { return Number(a.number) - Number(b.number); });
  return hadiths.map(function(h) {
    h.number = Number(h.number);
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
  var hadith = {
    id: uuid(),
    number: Number(data.number) || (sheet.getLastRow()),
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
  ['number', 'text', 'explanation', 'youtubeUrl', 'audioUrl', 'pdfUrl', 'category', 'narrator'].forEach(function(f) {
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
 * حفظ نسبة مشاهدة/استماع/قراءة الوسائط، واعتبارها مكتملة تلقائيًا
 * عند تجاوز النسبة التي يحددها المدير في الإعدادات.
 * mediaType: 'video' | 'audio' | 'pdf'
 * data: { percent, position? } للفيديو والصوت — { percent, lastPage, totalPages } لملف PDF
 */
function saveMediaProgress(hadithId, mediaType, data, session) {
  requireRole(session, ['student']);
  if (['video', 'audio', 'pdf'].indexOf(mediaType) === -1) {
    throw new Error('نوع وسائط غير معروف.');
  }
  var studentId = session.userId;
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
  var read = mediaType === 'pdf' ? nowComplete : existing ? toBool(existing.read) : false;

  if (existing) {
    if (!existing.startedAt) updates.startedAt = new Date().toISOString();
    if (watched && listened && read && !existing.completedAt) {
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
      completedAt: (watched && listened && read) ? new Date().toISOString() : '',
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

// ===== المقرر اليومي =====

function getDailyLessons(session) {
  var hadiths = getHadiths();
  var cycle = getActiveCycle();

  // حساب اليوم الحالي
  var currentDay = 1;
  var cycleDate = cycle ? new Date(cycle.startDate) : new Date();
  var today = new Date();
  var diffMs = today.getTime() - cycleDate.getTime();
  var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  currentDay = Math.min(diffDays + 1, PROGRAM_DAYS);

  // أحاديث اليوم
  var startIdx = (currentDay - 1) * HADITHS_PER_DAY;
  var dayHadiths = hadiths.slice(startIdx, startIdx + HADITHS_PER_DAY);

  return {
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
