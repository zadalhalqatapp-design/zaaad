var Users = {
  list: function (body, ctx) {
    Security.requireRole(ctx, 'manager');
    var filters = body.filters || {};
    var rows = Database.findAll('Users');
    return rows.filter(function (user) {
      if (filters.role && user.role !== filters.role) return false;
      if (filters.status && user.status !== filters.status) return false;
      if (filters.search) {
        var term = String(filters.search).toLowerCase();
        return String(user.full_name || '').toLowerCase().indexOf(term) !== -1 || String(user.email || '').toLowerCase().indexOf(term) !== -1;
      }
      return true;
    }).map(toProfile);
  },

  updateStatus: function (body, ctx) {
    Security.requireRole(ctx, 'manager');
    Validation.id(body.id, 'معرف المستخدم');
    var status = Validation.required(body.status, 'الحالة');
    if (['pending', 'approved', 'rejected', 'suspended'].indexOf(status) === -1) throw new Error('الحالة غير صحيحة.');
    Database.update('Users', 'id', body.id, { status: status, updated_at: nowIso() });
    var user = Database.findOne('Users', 'id', body.id);
    if (!user) throw new Error('المستخدم غير موجود.');
    return toProfile(user);
  },
};
