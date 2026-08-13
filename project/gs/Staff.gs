/**
 * إدارة المشرفين والمديرين
 */

// ===== المشرفون =====

function getSupervisors() {
  var sheet = getSheet(SHEETS.SUPERVISORS);
  return sheetToObjects(sheet).map(function(s) { return sanitizeUser(s); });
}

function addSupervisor(data, session) {
  requireRole(session, ['admin']);
  if (!data.name || !data.email || !data.password) throw new Error('الاسم والبريد وكلمة المرور مطلوبة.');
  data.email = String(data.email).trim().toLowerCase();

  if (findUserByEmail(SHEETS.SUPERVISORS, data.email)) throw new Error('البريد مسجل مسبقًا.');
  if (findUserByEmail(SHEETS.ADMINS, data.email)) throw new Error('البريد مسجل مسبقًا.');

  var sheet = getSheet(SHEETS.SUPERVISORS);
  var newSupervisor = {
    id: uuid(),
    name: data.name.trim(),
    email: data.email,
    passwordHash: hashPassword(data.password),
    phone: data.phone || '',
    status: 'approved',
    createdAt: new Date().toISOString(),
    avatarUrl: ''
  };
  appendRow(sheet, newSupervisor);
  logOperation(session, 'إضافة مشرف', newSupervisor.name);
  return { success: true };
}

function updateSupervisor(id, data, session) {
  requireRole(session, ['admin']);
  var sheet = getSheet(SHEETS.SUPERVISORS);
  var sup = findById(sheet, id);
  if (!sup) throw new Error('المشرف غير موجود.');

  var updates = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.password) updates.passwordHash = hashPassword(data.password);

  updateRow(sheet, id, updates);
  logOperation(session, 'تعديل مشرف', sup.name);
  return { success: true };
}

function deleteSupervisor(id, session) {
  requireRole(session, ['admin']);
  var sheet = getSheet(SHEETS.SUPERVISORS);
  var sup = findById(sheet, id);
  if (!sup) throw new Error('المشرف غير موجود.');

  deleteRowById(sheet, id);
  logOperation(session, 'حذف مشرف', sup.name);
  return { success: true };
}

// ===== المديرون =====

function getAdmins() {
  var sheet = getSheet(SHEETS.ADMINS);
  return sheetToObjects(sheet).map(function(s) { return sanitizeUser(s); });
}

function addAdmin(data, session) {
  requireRole(session, ['admin']); // فقط مدير يمكنه إضافة مدير
  if (!data.name || !data.email || !data.password) throw new Error('الاسم والبريد وكلمة المرور مطلوبة.');
  data.email = String(data.email).trim().toLowerCase();

  if (findUserByEmail(SHEETS.ADMINS, data.email)) throw new Error('البريد مسجل مسبقًا.');
  if (findUserByEmail(SHEETS.SUPERVISORS, data.email)) throw new Error('البريد مسجل مسبقًا.');

  var sheet = getSheet(SHEETS.ADMINS);
  var newAdmin = {
    id: uuid(),
    name: data.name.trim(),
    email: data.email,
    passwordHash: hashPassword(data.password),
    phone: data.phone || '',
    status: 'approved',
    createdAt: new Date().toISOString(),
    avatarUrl: ''
  };
  appendRow(sheet, newAdmin);
  logOperation(session, 'إضافة مدير', newAdmin.name);
  return { success: true };
}

function updateAdmin(id, data, session) {
  requireRole(session, ['admin']);
  var sheet = getSheet(SHEETS.ADMINS);
  var admin = findById(sheet, id);
  if (!admin) throw new Error('المدير غير موجود.');

  var updates = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.phone !== undefined) updates.phone = data.phone;
  if (data.password) updates.passwordHash = hashPassword(data.password);

  updateRow(sheet, id, updates);
  logOperation(session, 'تعديل مدير', admin.name);
  return { success: true };
}

function deleteAdmin(id, session) {
  requireRole(session, ['admin']);
  // منع حذف آخر مدير
  var sheet = getSheet(SHEETS.ADMINS);
  var admins = sheetToObjects(sheet);
  if (admins.length <= 1) throw new Error('لا يمكن حذف آخر مدير في النظام.');

  var admin = findById(sheet, id);
  if (!admin) throw new Error('المدير غير موجود.');
  if (admin.id === session.userId) throw new Error('لا يمكن حذف حسابك الحالي.');

  deleteRowById(sheet, id);
  logOperation(session, 'حذف مدير', admin.name);
  return { success: true };
}
