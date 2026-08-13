/**
 * الرسائل والإشعارات
 */

// ===== الرسائل =====

function getMessages(userId) {
  var sheet = getSheet(SHEETS.MESSAGES);
  var msgs = sheetToObjects(sheet);
  msgs = msgs.filter(function(m) { return m.toId === userId || m.fromId === userId; });
  msgs.sort(function(a, b) {
    return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
  });
  return msgs.map(function(m) {
    m.read = toBool(m.read);
    delete m._row;
    return m;
  });
}

function sendMessage(toId, subject, body, session) {
  if (!toId || !subject || !body) throw new Error('المستلم والموضوع والنص مطلوبة.');

  // البحث عن المستلم
  var recipient = null;
  var recipientRole = '';

  recipient = findById(getSheet(SHEETS.STUDENTS), toId);
  if (recipient) recipientRole = 'student';
  if (!recipient) {
    recipient = findById(getSheet(SHEETS.SUPERVISORS), toId);
    if (recipient) recipientRole = 'supervisor';
  }
  if (!recipient) {
    recipient = findById(getSheet(SHEETS.ADMINS), toId);
    if (recipient) recipientRole = 'admin';
  }
  if (!recipient) throw new Error('المستلم غير موجود.');

  var msg = {
    id: uuid(),
    fromId: session.userId,
    fromName: session.name,
    fromRole: session.role,
    toId: toId,
    toName: recipient.name,
    toRole: recipientRole,
    subject: subject,
    body: body,
    sentAt: formatDateTime(new Date()),
    read: false
  };
  appendRow(getSheet(SHEETS.MESSAGES), msg);
  logOperation(session, 'إرسال رسالة', 'إلى ' + recipient.name);
  return { success: true };
}

function markMessageRead(messageId, session) {
  var sheet = getSheet(SHEETS.MESSAGES);
  updateRow(sheet, messageId, { read: true });
  return { success: true };
}

// ===== الإشعارات =====

function getNotifications() {
  var sheet = getSheet(SHEETS.NOTIFICATIONS);
  var notifs = sheetToObjects(sheet);
  notifs.sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return notifs.map(function(n) { delete n._row; return n; });
}

function sendNotification(data, session) {
  requireRole(session, ['admin', 'supervisor']);
  if (!data.title || !data.body) throw new Error('العنوان والمحتوى مطلوبان.');

  var notif = {
    id: uuid(),
    title: data.title,
    body: data.body,
    target: data.target || 'all',
    targetId: data.targetId || '',
    createdAt: formatDateTime(new Date()),
    createdBy: session.name
  };
  appendRow(getSheet(SHEETS.NOTIFICATIONS), notif);
  logOperation(session, 'إرسال إشعار', data.title);
  return { success: true };
}
