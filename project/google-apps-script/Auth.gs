/**
 * المصادقة والجلسات — Auth & Session Management
 * يتحقق من هوية المستخدم وصلاحياته في كل طلب.
 */

var Auth = {
  signup: function (body) {
    var fullName = body.fullName;
    var email = (body.email || '').toLowerCase().trim();
    var password = body.password;
    var role = body.role || 'student';

    if (!fullName || !email || !password) throw new Error('البيانات غير مكتملة.');
    if (password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');

    var existing = Database.findOne('Users', 'email', email);
    if (existing) throw new Error('هذا البريد مسجّل مسبقًا.');

    var userId = generateId('usr');
    var status = role === 'manager' ? 'approved' : 'pending';
    var now = nowIso();

    var user = {
      id: userId,
      full_name: fullName,
      email: email,
      role: role,
      status: status,
      password_hash: hashPassword(password),
      phone: '',
      avatar_url: '',
      created_at: now,
      updated_at: now,
    };

    Database.insert('Users', user);

    var token = createSession(userId);
    var refreshToken = createSession(userId, true);

    return {
      token: token,
      refreshToken: refreshToken,
      profile: toProfile(user),
      message: status === 'pending'
        ? 'تم استلام طلبك. سيظهر بعد اعتماد الإدارة.'
        : 'تم إنشاء حساب المدير. يمكنك الدخول بعد المراجعة.',
    };
  },

  login: function (body) {
    var email = (body.email || '').toLowerCase().trim();
    var password = body.password;
    if (!email || !password) throw new Error('البريد وكلمة المرور مطلوبان.');

    var user = Database.findOne('Users', 'email', email);
    if (!user) throw new Error('بيانات الدخول غير صحيحة.');
    if (user.password_hash !== hashPassword(password)) throw new Error('بيانات الدخول غير صحيحة.');
    if (user.status === 'suspended') throw new Error('تم إيقاف هذا الحساب.');
    if (user.status === 'pending') throw new Error('حسابك بانتظار الموافقة.');
    if (user.status === 'rejected') throw new Error('تم رفض هذا الحساب.');

    var token = createSession(user.id);
    var refreshToken = createSession(user.id, true);

    return { token: token, refreshToken: refreshToken, profile: toProfile(user) };
  },

  logout: function (body, ctx) {
    if (ctx.auth) CacheService.getScriptCache().remove('session:' + ctx.auth.token);
    return { success: true };
  },

  me: function (ctx) {
    if (!ctx.user) return null;
    return toProfile(ctx.user);
  },

  updateProfile: function (body, ctx) {
    if (!ctx.user) throw new Error('غير مصرح.');
    var updates = body.updates || {};
    var allowed = {};
    if (updates.full_name) allowed.full_name = updates.full_name;
    if (updates.phone !== undefined) allowed.phone = updates.phone;
    if (updates.avatar_url !== undefined) allowed.avatar_url = updates.avatar_url;
    allowed.updated_at = nowIso();
    Database.update('Users', 'id', ctx.user.id, allowed);
    var updated = Database.findOne('Users', 'id', ctx.user.id);
    return toProfile(updated);
  },

  verifySession: function (token) {
    if (!token) return null;
    var cached = CacheService.getScriptCache().get('session:' + token);
    if (!cached) return null;
    var session;
    try { session = JSON.parse(cached); } catch (error) { return null; }
    var user = Database.findOne('Users', 'id', session.user_id);
    if (!user || user.status !== 'approved') return null;
    return { token: token, user: user };
  },
};

function createSession(userId, isRefresh) {
  var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  var now = Date.now();
  var ttl = isRefresh ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  CacheService.getScriptCache().put('session:' + token, JSON.stringify({ user_id: userId, expires_at: new Date(now + ttl).toISOString() }), isRefresh ? 21600 : 21600);
  return token;
}

function hashPassword(password) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + getJwtSecret(),
    Utilities.Charset.UTF_8,
  );
  return raw.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function toProfile(user) {
  if (!user) return null;
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatar_url: user.avatar_url || null,
    phone: user.phone || null,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
