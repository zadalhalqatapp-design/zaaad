/**
 * نظام المصادقة والجلسات
 */

/**
 * تسجيل الدخول — يبحث في المديرين والمشرفين والطلاب
 */
function login(email, password) {
  if (!email || !password) {
    var e = new Error('البريد الإلكتروني أو كلمة المرور غير صحيبة.');
    e.code = 'INVALID_CREDENTIALS';
    throw e;
  }

  email = String(email).trim().toLowerCase();

  // البحث في المديرين
  var user = findUserByEmail(SHEETS.ADMINS, email);
  var role = 'admin';
  // البحث في المشرفين
  if (!user) {
    user = findUserByEmail(SHEETS.SUPERVISORS, email);
    role = 'supervisor';
  }
  // البحث في الطلاب
  if (!user) {
    user = findUserByEmail(SHEETS.STUDENTS, email);
    role = 'student';
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    var err = new Error('البريد الإلكتروني أو كلمة المرور غير صحيبة.');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // التحقق من حالة الطالب
  if (role === 'student') {
    if (user.status === 'pending') {
      var pe = new Error('حسابك قيد المراجعة من قبل الإدارة.');
      pe.code = 'PENDING';
      throw pe;
    }
    if (user.status === 'rejected') {
      var re = new Error(user.rejectionReason || 'تم رفض حسابك.');
      re.code = 'REJECTED';
      throw re;
    }
    if (user.status === 'suspended') {
      var se = new Error(user.suspensionReason || 'تم إيقاف حسابك.');
      se.code = 'SUSPENDED';
      throw se;
    }
  }

  // إنشاء جلسة
  var session = createSession(user, role);
  logOperation(user, 'تسجيل الدخول', 'نجاح');

  return {
    session: session,
    user: sanitizeUser(Object.assign(user, { role: role }))
  };
}

/**
 * تسجيل طلب جديد (طالب)
 */
function register(data) {
  if (!data.name || !data.email || !data.password) {
    throw new Error('يرجى تعبئة جميع الحقول المطلوبة.');
  }

  data.email = String(data.email).trim().toLowerCase();

  // التحقق من عدم تكرار البريد
  var existing = findUserByEmail(SHEETS.STUDENTS, data.email);
  if (existing) {
    throw new Error('البريد الإلكتروني مسجل مسبقًا.');
  }
  existing = findUserByEmail(SHEETS.SUPERVISORS, data.email);
  if (existing) throw new Error('البريد الإلكتروني مسجل مسبقًا.');
  existing = findUserByEmail(SHEETS.ADMINS, data.email);
  if (existing) throw new Error('البريد الإلكتروني مسجل مسبقًا.');

  var id = uuid();
  var studentSheet = getSheet(SHEETS.STUDENTS);
  var newStudent = {
    id: id,
    name: data.name.trim(),
    email: data.email,
    passwordHash: hashPassword(data.password),
    phone: data.phone || '',
    status: 'pending',
    rejectionReason: '',
    suspensionReason: '',
    createdAt: new Date().toISOString(),
    approvedAt: '',
    avatarUrl: '',
    cycleId: ''
  };
  appendRow(studentSheet, newStudent);

  // تسجيل في طلبات التسجيل أيضًا
  var reqSheet = getSheet(SHEETS.REGISTRATION_REQUESTS);
  appendRow(reqSheet, {
    id: id,
    name: data.name.trim(),
    email: data.email,
    passwordHash: hashPassword(data.password),
    phone: data.phone || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  return { success: true, message: 'تم إرسال طلب التسجيل بنجاح. حسابك قيد المراجعة.' };
}

/**
 * تسجيل الخروج
 */
function logout(token) {
  if (!token) return { success: true };
  var sessionSheet = getSheet(SHEETS.SESSIONS);
  var sessions = sheetToObjects(sessionSheet);
  var session = sessions.find(function(s) { return s.token === token; });
  if (session) {
    deleteRowById(sessionSheet, session.id || session.token);
    logOperation({ id: session.userId, name: session.name, role: session.role }, 'تسجيل الخروج', 'نجاح');
  }
  return { success: true };
}

/**
 * التحقق من الجلسة
 */
function verifySession(token) {
  if (!token) return null;
  var session = verifyToken(token);
  if (!session) return null;

  // جلب بيانات المستخدم الحالية
  var sheetName = session.role === 'admin' ? SHEETS.ADMINS : session.role === 'supervisor' ? SHEETS.SUPERVISORS : SHEETS.STUDENTS;
  var user = findById(getSheet(sheetName), session.userId);
  if (!user) return null;

  // التحقق من حالة الطالب
  if (session.role === 'student' && user.status !== 'approved') {
    return null;
  }

  return {
    session: { token: session.token, userId: session.userId, role: session.role, name: session.name, email: session.email, expiresAt: session.expiresAt },
    user: sanitizeUser(Object.assign(user, { role: session.role }))
  };
}

/**
 * البحث عن مستخدم بالبريد في ورقة معينة
 */
function findUserByEmail(sheetName, email) {
  var sheet = getSheet(sheetName);
  var rows = sheetToObjects(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].email).toLowerCase() === email) return rows[i];
  }
  return null;
}

/**
 * إنشاء جلسة جديدة
 */
function createSession(user, role) {
  var token = generateToken();
  var expiresAt = Date.now() + (SESSION_TIMEOUT_HOURS * 60 * 60 * 1000);
  var sessionSheet = getSheet(SHEETS.SESSIONS);

  // حذف الجلسات القديمة لنفس المستخدم
  var sessions = sheetToObjects(sessionSheet);
  sessions.forEach(function(s) {
    if (s.userId === user.id) {
      deleteRowById(sessionSheet, s.token);
    }
  });

  appendRow(sessionSheet, {
    token: token,
    userId: user.id,
    role: role,
    name: user.name,
    email: user.email,
    expiresAt: expiresAt
  });

  return {
    token: token,
    userId: user.id,
    role: role,
    name: user.name,
    email: user.email,
    expiresAt: expiresAt
  };
}

/**
 * التحقق من صحة الطوكن
 */
function verifyToken(token) {
  if (!token) return null;
  var sessionSheet = getSheet(SHEETS.SESSIONS);
  var sessions = sheetToObjects(sessionSheet);
  var session = null;
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].token === token) {
      session = sessions[i];
      break;
    }
  }
  if (!session) return null;

  var expiresAt = Number(session.expiresAt);
  if (Date.now() > expiresAt) {
    deleteRowById(sessionSheet, session.token);
    return null;
  }

  return {
    token: session.token,
    userId: session.userId,
    role: session.role,
    name: session.name,
    email: session.email,
    expiresAt: expiresAt
  };
}

/**
 * التحقق من الصلاحية
 */
function requireRole(session, roles) {
  if (!session) throw new Error('غير مصرح.', 'UNAUTHORIZED');
  if (roles.indexOf(session.role) === -1) {
    var e = new Error('لا تملك صلاحية لهذه العملية.');
    e.code = 'FORBIDDEN';
    throw e;
  }
}
