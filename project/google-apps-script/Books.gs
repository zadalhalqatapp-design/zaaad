/**
 * إدارة الكتب — Books Management
 */

var Books = {
  list: function (body, ctx) {
    var filters = body.filters || {};
    var all = Database.findAll('Books');
    all = all.filter(function (b) {
      if (filters.status && b.status !== filters.status) return false;
      if (filters.search) {
        var q = filters.search.toLowerCase();
        if (!String(b.title).toLowerCase().includes(q) && !String(b.author || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
    return all.map(toBook);
  },

  get: function (body, ctx) {
    var book = Database.findOne('Books', 'id', body.id);
    if (!book) throw new Error('الكتاب غير موجود.');
    var units = Database.findWhere('BookUnits', { book_id: body.id });
    return { book: toBook(book), units: units.map(toUnit) };
  },

  create: function (body, ctx) {
    Security.requireManager(ctx);
    var input = body.input;
    if (!input.title) throw new Error('عنوان الكتاب مطلوب.');
    var now = nowIso();
    var book = {
      id: generateId('bk'),
      title: input.title,
      author: input.author || '',
      description: input.description || '',
      category: input.category || '',
      language: 'ar',
      cover_url: '',
      content_type: input.content_type || 'text',
      is_public: input.is_public ? 'true' : 'false',
      status: 'active',
      created_by: ctx.user.id,
      created_at: now,
      updated_at: now,
    };
    Database.insert('Books', book);
    return toBook(book);
  },

  update: function (body, ctx) {
    Security.requireManager(ctx);
    var updates = body.input;
    updates.updated_at = nowIso();
    Database.update('Books', 'id', body.id, updates);
    return toBook(Database.findOne('Books', 'id', body.id));
  },

  archive: function (body, ctx) {
    Security.requireManager(ctx);
    Database.update('Books', 'id', body.id, { status: 'archived', updated_at: nowIso() });
    return { success: true };
  },

  addUnit: function (body, ctx) {
    Security.requireManager(ctx);
    var input = body.input;
    var existing = Database.findWhere('BookUnits', { book_id: input.bookId });
    var order = existing.length + 1;
    var now = nowIso();
    var unit = {
      id: generateId('unt'),
      book_id: input.bookId,
      parent_id: input.parentId || '',
      title: input.title,
      unit_type: input.unitType || 'lesson',
      unit_order: order,
      content: input.content || '',
      media_url: input.mediaUrl || '',
      metadata: '{}',
      status: 'active',
      created_by: ctx.user.id,
      created_at: now,
      updated_at: now,
    };
    Database.insert('BookUnits', unit);
    return toUnit(unit);
  },

  updateUnit: function (body, ctx) {
    Security.requireManager(ctx);
    var updates = body.input;
    updates.updated_at = nowIso();
    Database.update('BookUnits', 'id', body.id, updates);
    return toUnit(Database.findOne('BookUnits', 'id', body.id));
  },

  reorderUnits: function (body, ctx) {
    Security.requireManager(ctx);
    var ids = body.unitIds;
    for (var i = 0; i < ids.length; i++) {
      Database.update('BookUnits', 'id', ids[i], { unit_order: i + 1, updated_at: nowIso() });
    }
    return { success: true };
  },
};

function toBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author || null,
    description: row.description || null,
    category: row.category || null,
    language: row.language || 'ar',
    cover_url: row.cover_url || null,
    content_type: row.content_type,
    is_public: String(row.is_public) === 'true',
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toUnit(row) {
  return {
    id: row.id,
    book_id: row.book_id,
    parent_id: row.parent_id || null,
    title: row.title,
    unit_type: row.unit_type,
    unit_order: Number(row.unit_order) || 0,
    content: row.content || null,
    media_url: row.media_url || null,
    metadata: parseJson(row.metadata, {}),
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

