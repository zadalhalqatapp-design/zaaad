/**
 * إدارة البرامج — Programs Management
 */

var Programs = {
  list: function (body, ctx) {
    var filters = body.filters || {};
    var all = Database.findAll('Programs');
    all = all.filter(function (p) {
      if (filters.status && p.status !== filters.status) return false;
      if (filters.published !== undefined && String(p.published) !== String(filters.published)) return false;
      return true;
    });
    return all.map(toProgram);
  },

  get: function (body, ctx) {
    var program = Database.findOne('Programs', 'id', body.id);
    if (!program) throw new Error('البرنامج غير موجود.');
    var books = Database.findWhere('ProgramBooks', { program_id: body.id });
    return { program: toProgram(program), books: books };
  },

  create: function (body, ctx) {
    Security.requireManager(ctx);
    var input = body.input;
    if (!input.name) throw new Error('اسم البرنامج مطلوب.');
    var now = nowIso();
    var program = {
      id: generateId('prg'),
      name: input.name,
      description: input.description || '',
      program_type: input.programType || 'course',
      start_date: '',
      end_date: '',
      rules: JSON.stringify(input.rules || {}),
      published: 'false',
      status: 'active',
      created_by: ctx.user.id,
      created_at: now,
      updated_at: now,
    };
    Database.insert('Programs', program);
    return toProgram(program);
  },

  update: function (body, ctx) {
    Security.requireManager(ctx);
    var updates = body.input;
    if (updates.rules && typeof updates.rules === 'object') updates.rules = JSON.stringify(updates.rules);
    updates.updated_at = nowIso();
    Database.update('Programs', 'id', body.id, updates);
    return toProgram(Database.findOne('Programs', 'id', body.id));
  },

  archive: function (body, ctx) {
    Security.requireManager(ctx);
    Database.update('Programs', 'id', body.id, { status: 'archived', updated_at: nowIso() });
    return { success: true };
  },

  togglePublish: function (body, ctx) {
    Security.requireManager(ctx);
    var published = body.published ? 'true' : 'false';
    Database.update('Programs', 'id', body.id, { published: published, updated_at: nowIso() });
    return toProgram(Database.findOne('Programs', 'id', body.id));
  },

  clone: function (body, ctx) {
    Security.requireManager(ctx);
    var original = Database.findOne('Programs', 'id', body.id);
    if (!original) throw new Error('البرنامج الأصلي غير موجود.');
    var now = nowIso();
    var clone = {
      id: generateId('prg'),
      name: original.name + ' (نسخة)',
      description: original.description,
      program_type: original.program_type,
      start_date: '',
      end_date: '',
      rules: original.rules,
      published: 'false',
      status: 'active',
      created_by: ctx.user.id,
      created_at: now,
      updated_at: now,
    };
    Database.insert('Programs', clone);
    var originalBooks = Database.findWhere('ProgramBooks', { program_id: body.id });
    originalBooks.forEach(function (pb) {
      Database.insert('ProgramBooks', {
        id: generateId('pb'),
        program_id: clone.id,
        book_id: pb.book_id,
        created_at: now,
      });
    });
    return toProgram(clone);
  },

  linkBook: function (body, ctx) {
    Security.requireManager(ctx);
    var existing = Database.findWhere('ProgramBooks', { program_id: body.programId, book_id: body.bookId });
    if (existing.length > 0) return { success: true };
    Database.insert('ProgramBooks', {
      id: generateId('pb'),
      program_id: body.programId,
      book_id: body.bookId,
      created_at: nowIso(),
    });
    return { success: true };
  },

  unlinkBook: function (body, ctx) {
    Security.requireManager(ctx);
    var row = Database.findWhere('ProgramBooks', { program_id: body.programId, book_id: body.bookId })[0];
    if (row) Database.deleteWhere('ProgramBooks', 'id', row.id);
    return { success: true };
  },
};

function toProgram(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    program_type: row.program_type,
    start_date: row.start_date || null,
    end_date: row.end_date || null,
    rules: parseJson(row.rules, {}),
    published: String(row.published) === 'true',
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
