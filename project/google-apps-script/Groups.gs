/**
 * إدارة الحلقات والمجموعات — Groups Management
 */

var Groups = {
  list: function (body, ctx) {
    var filters = body.filters || {};
    var all = Database.findAll('Groups');
    if (ctx.user.role === 'supervisor') {
      var myMemberRows = Database.findWhere('GroupMembers', { user_id: ctx.user.id, member_role: 'supervisor' });
      var myGroupIds = myMemberRows.map(function (m) { return m.group_id; });
      all = all.filter(function (g) { return myGroupIds.indexOf(g.id) !== -1; });
    }
    if (ctx.user.role === 'student') {
      var myEnrollments = Database.findWhere('Enrollments', { student_id: ctx.user.id });
      var myGroupIds2 = myEnrollments.map(function (e) { return e.group_id; }).filter(Boolean);
      all = all.filter(function (g) { return myGroupIds2.indexOf(g.id) !== -1; });
    }
    all = all.filter(function (g) {
      if (filters.programId && g.program_id !== filters.programId) return false;
      if (filters.status && g.status !== filters.status) return false;
      return true;
    });
    return all.map(toGroup);
  },

  create: function (body, ctx) {
    Security.requireManager(ctx);
    var input = body.input;
    if (!input.name) throw new Error('اسم الحلقة مطلوب.');
    if (!input.programId) throw new Error('البرنامج مطلوب.');
    var now = nowIso();
    var group = {
      id: generateId('grp'),
      program_id: input.programId,
      name: input.name,
      description: input.description || '',
      status: 'active',
      created_by: ctx.user.id,
      created_at: now,
      updated_at: now,
    };
    Database.insert('Groups', group);
    if (input.supervisorId) {
      Database.insert('GroupMembers', {
        id: generateId('gm'),
        group_id: group.id,
        user_id: input.supervisorId,
        member_role: 'supervisor',
        joined_at: now,
        left_at: '',
        status: 'active',
      });
    }
    return toGroup(group);
  },

  update: function (body, ctx) {
    Security.requireManager(ctx);
    var updates = body.input;
    updates.updated_at = nowIso();
    Database.update('Groups', 'id', body.id, updates);
    return toGroup(Database.findOne('Groups', 'id', body.id));
  },

  archive: function (body, ctx) {
    Security.requireManager(ctx);
    Database.update('Groups', 'id', body.id, { status: 'archived', updated_at: nowIso() });
    return { success: true };
  },

  listMembers: function (body, ctx) {
    Security.requireSupervisorOrManager(ctx);
    var members = Database.findWhere('GroupMembers', { group_id: body.groupId });
    return members.map(function (m) {
      var profile = Database.findOne('Users', 'id', m.user_id);
      return {
        id: m.id,
        group_id: m.group_id,
        user_id: m.user_id,
        member_role: m.member_role,
        joined_at: m.joined_at,
        status: m.status,
        profile: { id: profile.id, full_name: profile.full_name, email: profile.email },
      };
    });
  },

  addMember: function (body, ctx) {
    Security.requireManager(ctx);
    var existing = Database.findWhere('GroupMembers', { group_id: body.groupId, user_id: body.userId, status: 'active' });
    if (existing.length > 0) return { success: true };
    Database.insert('GroupMembers', {
      id: generateId('gm'),
      group_id: body.groupId,
      user_id: body.userId,
      member_role: body.memberRole || 'student',
      joined_at: nowIso(),
      left_at: '',
      status: 'active',
    });
    return { success: true };
  },

  removeMember: function (body, ctx) {
    Security.requireManager(ctx);
    var row = Database.findWhere('GroupMembers', { group_id: body.groupId, user_id: body.userId, status: 'active' })[0];
    if (row) Database.update('GroupMembers', 'id', row.id, { status: 'archived', left_at: nowIso() });
    return { success: true };
  },

  transferStudent: function (body, ctx) {
    Security.requireManager(ctx);
    Database.update('Enrollments', 'id', body.enrollmentId, { group_id: body.toGroupId, updated_at: nowIso() });
    return { success: true };
  },
};

function toGroup(row) {
  return {
    id: row.id,
    program_id: row.program_id,
    name: row.name,
    description: row.description || null,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
