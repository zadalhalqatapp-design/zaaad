/**
 * تعريف أسماء أوراق العمل (16 ورقة مترابطة)
 */
var SHEETS = {
  ADMINS: 'المديرون',
  SUPERVISORS: 'المشرفون',
  STUDENTS: 'الطلاب',
  REGISTRATION_REQUESTS: 'طلبات التسجيل',
  HADITHS: 'الأحاديث',
  PROGRESS: 'الإنجاز',
  CYCLES: 'الدورات',
  CERTIFICATES: 'الشهادات',
  MESSAGES: 'الرسائل',
  NOTIFICATIONS: 'الإشعارات',
  OPERATION_LOG: 'سجل العمليات',
  SETTINGS: 'الإعدادات',
  SESSIONS: 'الجلسات',
  BACKUPS: 'النسخ الاحتياطية',
  FILES: 'الملفات',
  DAILY_LESSONS: 'المقرر اليومي'
};

/** رؤوس الأعمدة لكل ورقة */
var SHEET_HEADERS = {
  'المديرون': ['id', 'name', 'email', 'passwordHash', 'phone', 'status', 'createdAt', 'avatarUrl'],
  'المشرفون': ['id', 'name', 'email', 'passwordHash', 'phone', 'status', 'createdAt', 'avatarUrl'],
  'الطلاب': ['id', 'name', 'email', 'passwordHash', 'phone', 'status', 'rejectionReason', 'suspensionReason', 'createdAt', 'approvedAt', 'avatarUrl', 'cycleId'],
  'طلبات التسجيل': ['id', 'name', 'email', 'passwordHash', 'phone', 'status', 'createdAt'],
  'الأحاديث': ['id', 'number', 'text', 'explanation', 'youtubeUrl', 'audioUrl', 'pdfUrl', 'category', 'narrator'],
  'الإنجاز': ['id', 'studentId', 'hadithId', 'memorized', 'listened', 'read', 'watched', 'videoPercent', 'videoPosition', 'audioPercent', 'audioPosition', 'pdfPercent', 'pdfLastPage', 'pdfTotalPages', 'startedAt', 'completedAt', 'updatedAt'],
  'الدورات': ['id', 'name', 'startDate', 'endDate', 'status', 'studentIds'],
  'الشهادات': ['id', 'certificateNumber', 'studentId', 'studentName', 'cycleId', 'cycleName', 'issueDate', 'progressPercent', 'qrCode'],
  'الرسائل': ['id', 'fromId', 'fromName', 'fromRole', 'toId', 'toName', 'toRole', 'subject', 'body', 'sentAt', 'read'],
  'الإشعارات': ['id', 'title', 'body', 'target', 'targetId', 'createdAt', 'createdBy'],
  'سجل العمليات': ['id', 'timestamp', 'userId', 'userName', 'userRole', 'operation', 'details'],
  'الإعدادات': ['key', 'value'],
  'الجلسات': ['token', 'userId', 'role', 'name', 'email', 'expiresAt'],
  'النسخ الاحتياطية': ['id', 'name', 'createdAt', 'size', 'createdBy', 'data'],
  'الملفات': ['id', 'name', 'type', 'url', 'folder', 'uploadedAt'],
  'المقرر اليومي': ['id', 'cycleId', 'day', 'date', 'hadithIds']
};

var PROGRAM_DAYS = 20;
var HADITHS_COUNT = 40;
var HADITHS_PER_DAY = 2;
var SESSION_TIMEOUT_HOURS = 8;

/**
 * معرّف جدول البيانات (مطلوب فقط عند نشر السكربت بشكل مستقل خارج الجدول).
 * كيفية الحصول عليه:
 * 1. افتح جدول البيانات في Google Sheets
 * 2. انسخ المعرف من الرابط: docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
 * 3. ضعه بين علامتي التنصيص أدناه
 */
var SPREADSHEET_ID = '';
