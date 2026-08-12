/**
 * الاختبارات — Tests Management
 */

var Tests = {
  list: function (body, ctx) {
    var filters = body.filters || {};
    var all = Database.findAll('Tests');
    all = all.filter(function (t) {
      if (filters.programId && t.program_id !== filters.programId) return false;
      if (filters.status && t.status !== filters.status) return false;
      return true;
    });
    return all.map(toTest);
  },

  create: function (body, ctx) {
    Security.requireSupervisorOrManager(ctx);
    var input = body.input;
    var now = nowIso();
    var test = {
      id: generateId('tst'),
      program_id: input.programId,
      title: input.title,
      description: input.description || '',
      passing_score: input.passingScore || 70,
      scheduled_at: input.scheduledAt || '',
      status: 'active',
      created_by: ctx.user.id,
      created_at: now,
      updated_at: now,
    };
    Database.insert('Tests', test);
    return toTest(test);
  },

  listResults: function (body, ctx) {
    var filters = body.filters || {};
    var rows = Database.findAll('TestResults');
    return rows.filter(function (row) {
      if (filters.enrollmentId && row.enrollment_id !== filters.enrollmentId) return false;
      if (ctx.user.role === 'student') {
        var enrollment = Database.findOne('Enrollments', 'id', row.enrollment_id);
        return enrollment && enrollment.student_id === ctx.user.id;
      }
      if (ctx.user.role === 'supervisor') {
        var supervised = Database.findOne('Enrollments', 'id', row.enrollment_id);
        return supervised && supervised.supervisor_id === ctx.user.id;
      }
      return true;
    }).slice(0, Number(filters.limit) || 50).map(toResult);
  },

  recordResult: function (body, ctx) {
    Security.requireSupervisorOrManager(ctx);
    var input = body.input;
    var enrollment = Database.findOne('Enrollments', 'id', input.enrollmentId);
    if (!enrollment) throw new Error('التسجيل غير موجود.');
    Security.requireSupervisorAccess(ctx, enrollment.student_id);

    var now = nowIso();
    var result = {
      id: generateId('tr'),
      test_id: input.testId,
      enrollment_id: input.enrollmentId,
      score: input.score,
      passed: input.passed ? 'true' : 'false',
      errors: JSON.stringify(input.errors || []),
      notes: input.notes || '',
      tested_at: now,
      created_by: ctx.user.id,
      created_at: now,
    };
    Database.insert('TestResults', result);

    var program = Database.findOne('Programs', 'id', enrollment.program_id);
    var rules = parseJson(program.rules, {});
    var passingScore = rules.passing_score || 70;

    var newStatus = enrollment.status;
    if (input.passed) {
      newStatus = 'passed';
      if (Number(enrollment.progress) >= 100) {
        newStatus = 'completed';
        Database.update('Enrollments', 'id', enrollment.id, { completed_at: now });
      }
    } else {
      newStatus = 'failed';
    }
    Database.update('Enrollments', 'id', enrollment.id, { status: newStatus, updated_at: now });

    return toResult(result);
  },
};

function toTest(row) {
  return {
    id: row.id,
    program_id: row.program_id,
    title: row.title,
    description: row.description || null,
    passing_score: Number(row.passing_score) || 70,
    scheduled_at: row.scheduled_at || null,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toResult(row) {
  return {
    id: row.id,
    test_id: row.test_id,
    enrollment_id: row.enrollment_id,
    score: Number(row.score) || 0,
    passed: String(row.passed) === 'true',
    errors: parseJson(row.errors, []),
    notes: row.notes || null,
    tested_at: row.tested_at,
    created_by: row.created_by,
    created_at: row.created_at,
  };
}
