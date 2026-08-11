/**
 * التسميع والحفظ — Listening & Memorization Records
 */

var Listening = {
  list: function (body, ctx) {
    var filters = body.filters || {};
    var all = Database.findAll('ListeningRecords');

    if (ctx.user.role === 'student') {
      all = all.filter(function (r) { return r.student_id === ctx.user.id; });
    } else if (ctx.user.role === 'supervisor') {
      all = all.filter(function (r) { return r.supervisor_id === ctx.user.id; });
    }

    all = all.filter(function (r) {
      if (filters.enrollmentId && r.enrollment_id !== filters.enrollmentId) return false;
      if (filters.studentId && r.student_id !== filters.studentId) return false;
      return true;
    });

    if (filters.limit) all = all.slice(0, filters.limit);

    return all.map(toRecord);
  },

  create: function (body, ctx) {
    Security.requireSupervisorOrManager(ctx);
    var input = body.input;
    var enrollment = Database.findOne('Enrollments', 'id', input.enrollmentId);
    if (!enrollment) throw new Error('التسجيل غير موجود.');
    Security.requireSupervisorAccess(ctx, enrollment.student_id);

    var existing = Database.findWhere('ListeningRecords', {
      enrollment_id: input.enrollmentId,
      unit_id: input.unitId,
      operation_type: input.operationType,
    });
    var attemptNumber = existing.length + 1;

    var now = nowIso();
    var record = {
      id: generateId('rec'),
      enrollment_id: input.enrollmentId,
      student_id: enrollment.student_id,
      unit_id: input.unitId,
      supervisor_id: ctx.user.id,
      operation_type: input.operationType,
      attempt_number: attemptNumber,
      score: input.score != null ? input.score : '',
      errors: JSON.stringify(input.errors || []),
      notes: input.notes || '',
      recorded_at: now,
      created_at: now,
    };
    Database.insert('ListeningRecords', record);

    updateEnrollmentProgress(enrollment);
    return toRecord(record);
  },
};

function toRecord(row) {
  return {
    id: row.id,
    enrollment_id: row.enrollment_id,
    student_id: row.student_id,
    unit_id: row.unit_id,
    supervisor_id: row.supervisor_id || null,
    operation_type: row.operation_type,
    attempt_number: Number(row.attempt_number) || 1,
    score: row.score !== '' ? Number(row.score) : null,
    errors: parseJson(row.errors, []),
    notes: row.notes || null,
    recorded_at: row.recorded_at,
    created_at: row.created_at,
  };
}

function updateEnrollmentProgress(enrollment) {
  var units = Database.findWhere('BookUnits', {});
  var programBooks = Database.findWhere('ProgramBooks', { program_id: enrollment.program_id });
  var totalUnits = 0;
  programBooks.forEach(function (pb) {
    totalUnits += units.filter(function (u) { return u.book_id === pb.book_id && u.status === 'active'; }).length;
  });

  var completedRecords = Database.findWhere('ListeningRecords', {
    enrollment_id: enrollment.id,
    operation_type: 'new_memorization',
  });
  var completedUnits = completedRecords.length;
  var progress = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  var program = Database.findOne('Programs', 'id', enrollment.program_id);
  var rules = parseJson(program.rules, {});
  var passingScore = rules.passing_score || 70;
  var requiredUnits = rules.required_units || totalUnits;

  var newStatus = enrollment.status;
  if (progress >= 100) {
    newStatus = 'ready_for_test';
  } else if (completedUnits >= requiredUnits) {
    newStatus = 'ready_for_test';
  }

  Database.update('Enrollments', 'id', enrollment.id, {
    progress: progress,
    status: newStatus,
    updated_at: nowIso(),
  });
}
