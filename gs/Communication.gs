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
  // المشرف يراسل طلاب دورته فقط، والطالب يراسل الإدارة والمشرفين فقط (لا طالبًا آخر)
  if (recipientRole === 'student') {
    if (session.role === 'student') throw new Error('يمكنك مراسلة الإدارة والمشرفين فقط.');
    assertStudentAccess_(session, toId);
  }

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
  var msg = findById(sheet, messageId);
  if (!msg) throw new Error('الرسالة غير موجودة.');
  if (msg.toId !== session.userId) throw new Error('غير مصرح.');
  updateRow(sheet, messageId, { read: true });
  return { success: true };
}

// ===== الإشعارات =====

/**
 * الإشعارات المرئية للمستخدم: المدير يرى الكل؛ المشرف يرى (للجميع/للمشرفين/ما أرسله)؛
 * الطالب يرى (للجميع، لطلاب دورته أو لجميع الطلاب، أو الموجَّه له شخصيًا).
 */
function getNotifications(session) {
  var sheet = getSheet(SHEETS.NOTIFICATIONS);
  var notifs = sheetToObjects(sheet);
  if (session && session.role === 'supervisor') {
    notifs = notifs.filter(function(n) { return n.target === 'all' || n.target === 'supervisors' || n.createdBy === session.name; });
  } else if (session && session.role === 'student') {
    var myCycle = studentCycle_(session.userId);
    var myCycleId = myCycle ? myCycle.id : '';
    notifs = notifs.filter(function(n) {
      if (n.target === 'all') return true;
      if (n.target === 'students') return !n.targetId || n.targetId === myCycleId;
      if (n.target === 'student') return n.targetId === session.userId;
      return false;
    });
  }
  notifs.sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return notifs.map(function(n) { delete n._row; return n; });
}

function sendNotification(data, session) {
  requireRole(session, ['admin', 'supervisor']);
  if (!data.title || !data.body) throw new Error('العنوان والمحتوى مطلوبان.');

  var target = data.target || 'all';
  var targetId = data.targetId || '';
  if (session.role === 'supervisor') {
    if (target === 'student') {
      assertStudentAccess_(session, targetId); // لطالب من دورته فقط
    } else if (target === 'all' || target === 'students') {
      // البثّ العام للمشرف يقتصر على طلاب دورته: نخزّن معرّف دورته
      var mine = supervisorCycleIds_(session)[0];
      if (!mine) throw new Error('لم تُخصَّص لك دورة بعد.');
      target = 'students';
      targetId = mine;
    } else if (target !== 'supervisors') {
      throw new Error('هدف الإشعار غير مسموح.');
    }
  }
  var notif = {
    id: uuid(),
    title: data.title,
    body: data.body,
    target: target,
    targetId: targetId,
    createdAt: formatDateTime(new Date()),
    createdBy: session.name
  };
  appendRow(getSheet(SHEETS.NOTIFICATIONS), notif);
  logOperation(session, 'إرسال إشعار', data.title);
  return { success: true };
}
