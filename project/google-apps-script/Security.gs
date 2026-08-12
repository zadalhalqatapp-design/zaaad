/**
 * التحقق من الصلاحيات — Authorization & Security
 */

var Security = {
  requireRole: function (ctx) {
    var roles = [];
    for (var _i = 1; _i < arguments.length; _i++) roles[_i - 1] = arguments[_i];
    if (!ctx || !ctx.user) throw new Error('غير مصرح.');
    if (roles.indexOf(ctx.user.role) === -1) throw new Error('لا تملك صلاحية لهذا الإجراء.');
  },

  requireManager: function (ctx) {
    this.requireRole(ctx, 'manager');
  },

  requireSupervisorOrManager: function (ctx) {
    this.requireRole(ctx, 'supervisor', 'manager');
  },

  /** منع IDOR: الطالب يصل لبياناته فقط */
  requireOwnership: function (ctx, resourceUserId) {
    if (!ctx || !ctx.user) throw new Error('غير مصرح.');
    if (ctx.user.role === 'manager') return;
    if (ctx.user.role === 'supervisor') {
      var enrollments = Database.findWhere('Enrollments', { supervisor_id: ctx.user.id, student_id: resourceUserId });
      if (enrollments.length === 0) throw new Error('لا تملك صلاحية للوصول لهذا الطالب.');
      return;
    }
    if (ctx.user.id !== resourceUserId) throw new Error('لا تملك صلاحية للوصول لهذا المورد.');
  },

  /** المشرف يصل فقط لطلابه */
  requireSupervisorAccess: function (ctx, studentId) {
    if (!ctx || !ctx.user) throw new Error('غير مصرح.');
    if (ctx.user.role === 'manager') return;
    if (ctx.user.role === 'supervisor') {
      var rows = Database.findWhere('Enrollments', { supervisor_id: ctx.user.id, student_id: studentId });
      if (rows.length === 0) throw new Error('لا تملك صلاحية للوصول لهذا الطالب.');
      return;
    }
    if (ctx.user.id !== studentId) throw new Error('لا تملك صلاحية.');
  },
};
