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
  DAILY_LESSONS: 'المقرر اليومي',
  BOOKS: 'الكتب',
  BOOK_ASSIGNMENTS: 'تعيين الكتب',
  ACHIEVEMENTS: 'اعتماد الإنجاز'
};

/** رؤوس الأعمدة لكل ورقة */
var SHEET_HEADERS = {
  'المديرون': ['id', 'name', 'email', 'passwordHash', 'phone', 'status', 'createdAt', 'avatarUrl'],
  'المشرفون': ['id', 'name', 'email', 'passwordHash', 'phone', 'status', 'createdAt', 'avatarUrl', 'cycleIds'],
  'الطلاب': ['id', 'name', 'email', 'passwordHash', 'phone', 'status', 'rejectionReason', 'suspensionReason', 'createdAt', 'approvedAt', 'avatarUrl', 'cycleId', 'gender'],
  'طلبات التسجيل': ['id', 'name', 'email', 'passwordHash', 'phone', 'status', 'createdAt', 'gender'],
  'الأحاديث': ['id', 'number', 'text', 'explanation', 'youtubeUrl', 'audioUrl', 'pdfUrl', 'category', 'narrator', 'bookId'],
  'الإنجاز': ['id', 'studentId', 'hadithId', 'memorized', 'listened', 'read', 'watched', 'videoPercent', 'videoPosition', 'audioPercent', 'audioPosition', 'pdfPercent', 'pdfLastPage', 'pdfTotalPages', 'startedAt', 'completedAt', 'updatedAt'],
  'الدورات': ['id', 'name', 'startDate', 'endDate', 'status', 'studentIds'],
  'الشهادات': ['id', 'certificateNumber', 'studentId', 'studentName', 'cycleId', 'cycleName', 'issueDate', 'progressPercent', 'qrCode', 'bookId', 'bookTitle', 'grade', 'studentGender'],
  'الرسائل': ['id', 'fromId', 'fromName', 'fromRole', 'toId', 'toName', 'toRole', 'subject', 'body', 'sentAt', 'read'],
  'الإشعارات': ['id', 'title', 'body', 'target', 'targetId', 'createdAt', 'createdBy'],
  'سجل العمليات': ['id', 'timestamp', 'userId', 'userName', 'userRole', 'operation', 'details'],
  'الإعدادات': ['key', 'value'],
  'الجلسات': ['token', 'userId', 'role', 'name', 'email', 'expiresAt'],
  'النسخ الاحتياطية': ['id', 'name', 'createdAt', 'size', 'createdBy', 'data'],
  'الملفات': ['id', 'name', 'type', 'url', 'folder', 'uploadedAt'],
  'المقرر اليومي': ['id', 'cycleId', 'day', 'date', 'hadithIds'],
  'الكتب': ['id', 'title', 'description', 'daysCount', 'itemsPerDay', 'autoAssign', 'status', 'order', 'createdAt'],
  'تعيين الكتب': ['id', 'studentId', 'bookId', 'startDate', 'assignedBy', 'assignedAt'],
  'اعتماد الإنجاز': ['id', 'studentId', 'bookId', 'grade', 'notes', 'progressPercent', 'approvedBy', 'approvedById', 'approvedAt']
};

/** الكتاب الأساسي: كل الأحاديث الموجودة قبل ميزة الكتب المتعددة تنتمي إليه. */
var DEFAULT_BOOK_ID = 'book_default';
var DEFAULT_BOOK_TITLE = 'الأحاديث الأربعون';

var PROGRAM_DAYS = 20;
var HADITHS_COUNT = 40;
var HADITHS_PER_DAY = 2;
// الجلسة تبقى 90 يومًا وتتجدّد تلقائيًا مع الاستخدام (انظر verifyToken) —
// فلا يُطلب من المستخدم تسجيل الدخول من جديد ما دام يفتح التطبيق بين حين وآخر.
var SESSION_TIMEOUT_HOURS = 24 * 90;
// أقصى عدد أجهزة مسجَّلة الدخول معًا لنفس الحساب (الأقدم يُخرَج عند تجاوز الحد)
var MAX_SESSIONS_PER_USER = 5;

/**
 * معرّف جدول البيانات (مطلوب فقط عند نشر السكربت بشكل مستقل خارج الجدول).
 * كيفية الحصول عليه:
 * 1. افتح جدول البيانات في Google Sheets
 * 2. انسخ المعرف من الرابط: docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
 * 3. ضعه بين علامتي التنصيص أدناه
 */
var SPREADSHEET_ID = '';
