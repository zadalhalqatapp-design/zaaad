/**
 * الإشعارات — Notifications
 */

var Notifications = {
  list: function (body, ctx) {
    if (!ctx.user) throw new Error('غير مصرح.');
    var all = Database.findWhere('Notifications', { user_id: ctx.user.id });
    all.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    return all.slice(0, 20).map(toNotification);
  },

  markRead: function (body, ctx) {
    if (!ctx.user) throw new Error('غير مصرح.');
    Database.update('Notifications', 'id', body.id, { read_at: nowIso() });
    return { success: true };
  },

  send: function (userId, title, body, kind) {
    Database.insert('Notifications', {
      id: generateId('ntf'),
      user_id: userId,
      title: title,
      body: body,
      kind: kind || 'info',
      read_at: '',
      created_at: nowIso(),
    });
  },
};

function toNotification(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    body: row.body,
    kind: row.kind,
    read_at: row.read_at || null,
    created_at: row.created_at,
  };
}
