/**
 * التسجيل في البرامج — Enrollments
 */

var Enrollments = {
  list: function (body, ctx) {
    Security.requireSupervisorOrManager(ctx);
    var filters = body.filters || {};
    var all = Database.findAll('Enrollments');

    if (ctx.user.role === 'supervisor') {
      all = all.filter(function (e) { return e.supervisor_id === ctx.user.id; });
    }

    all = all.filter(function (e) {
      if (filters.studentId && e.student_id !== filters.studentId) return false;
      if (filters.supervisorId && e.supervisor_id !== filters.supervisorId) return false;
      if (filters.groupId && e.group_id !== filters.groupId) return false;
      if (filters.programId && e.program_id !== filters.programId) return false;
      if (filters.status && e.status !== filters.status) return false;
      return true;
    });

    return all.map(function (e) {
      var profile = Database.findOne('Users', 'id', e.student_id);
      var program = Database.findOne('Programs', 'id', e.program_id);
      var group = e.group_id ? Database.findOne('Groups', 'id', e.group_id) : null;
      return {
        id: e.id,
        student_id: e.student_id,
        program_id: e.program_id,
        group_id: e.group_id || null,
        supervisor_id: e.supervisor_id || null,
        status: e.status,
        progress: Number(e.progress) || 0,
        points: Number(e.points) || 0,
        started_at: e.started_at || null,
        completed_at: e.completed_at || null,
        created_at: e.created_at,
        updated_at: e.updated_at,
        profile: { id: profile.id, full_name: profile.full_name, email: profile.email, phone: profile.phone },
        program: { id: program.id, name: program.name, description: program.description || '' },
        group: group ? { id: group.id, name: group.name } : null,
      };
    });
  },

  get: function (body, ctx) {
    var e = Database.findOne('Enrollments', 'id', body.id);
    if (!e) throw new Error('التسجيل غير موجود.');
    Security.requireSupervisorAccess(ctx, e.student_id);
    return e;
  },

  create: function (body, ctx) {
    Security.requireManager(ctx);
    var input = body.input;
    var now = nowIso();
    var enrollment = {
      id: generateId('enr'),
      student_id: input.studentId,
      program_id: input.programId,
      group_id: input.groupId || '',
      supervisor_id: input.supervisorId || '',
      status: 'active',
      progress: 0,
      points: 0,
      started_at: now,
      completed_at: '',
      created_by: ctx.user.id,
      created_at: now,
      updated_at: now,
    };
    Database.insert('Enrollments', enrollment);
    return enrollment;
  },

  updateStatus: function (body, ctx) {
    Security.requireSupervisorOrManager(ctx);
    Database.update('Enrollments', 'id', body.id, { status: body.status, updated_at: nowIso() });
    return Database.findOne('Enrollments', 'id', body.id);
  },

  mine: function (body, ctx) {
    if (!ctx.user) throw new Error('غير مصرح.');
    var all = Database.findWhere('Enrollments', { student_id: ctx.user.id });
    return all.map(function (e) {
      var program = Database.findOne('Programs', 'id', e.program_id);
      var group = e.group_id ? Database.findOne('Groups', 'id', e.group_id) : null;
      return {
        id: e.id,
        student_id: e.student_id,
        program_id: e.program_id,
        group_id: e.group_id || null,
        supervisor_id: e.supervisor_id || null,
        status: e.status,
        progress: Number(e.progress) || 0,
        points: Number(e.points) || 0,
        started_at: e.started_at || null,
        completed_at: e.completed_at || null,
        created_at: e.created_at,
        updated_at: e.updated_at,
        program: { id: program.id, name: program.name, description: program.description || '' },
        group: group ? { id: group.id, name: group.name } : null,
      };
    });
  },
};
