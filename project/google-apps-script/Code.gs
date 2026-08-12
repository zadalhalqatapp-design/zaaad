/**
 * زاد الحلقات — نقطة الدخول الرئيسية لـ Google Apps Script
 * يستقبل جميع الطلبات من واجهة React ويوزّعها على الوحدات المناسبة.
 */

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    var body;
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.payload) {
      body = JSON.parse(e.parameter.payload);
    } else {
      return jsonOut({ ok: false, error: 'طلب غير صالح.' }, corsHeaders);
    }

    var action = body.action;
    if (!action) return jsonOut({ ok: false, error: 'الإجراء مطلوب.' }, corsHeaders);

    var result = route(action, body);
    return jsonOut({ ok: true, data: result }, corsHeaders);
  } catch (err) {
    logError(err);
    var msg = err && err.message ? err.message : 'حدث خطأ غير متوقع في الخادم.';
    return jsonOut({ ok: false, error: msg }, corsHeaders);
  }
}

function jsonOut(obj, headers) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function route(action, body) {
  var token = body.token || null;
  var auth = Auth.verifySession(token);
  var isPublic = AUTH_PUBLIC_ACTIONS[action];

  if (!isPublic && !auth) throw new Error('غير مصرح. سجّل الدخول أولًا.');

  var ctx = { auth: auth, body: body, user: auth ? auth.user : null };

  switch (action) {
    // Auth
    case 'auth_signup': return Auth.signup(body);
    case 'auth_login': return Auth.login(body);
    case 'auth_logout': return Auth.logout(body, ctx);
    case 'auth_me': return Auth.me(ctx);
    case 'auth_update_profile': return Auth.updateProfile(body, ctx);

    // Users
    case 'users_list': return Users.list(body, ctx);
    case 'users_update_status': return Users.updateStatus(body, ctx);

    // Books
    case 'books_list': return Books.list(body, ctx);
    case 'books_get': return Books.get(body, ctx);
    case 'books_create': return Books.create(body, ctx);
    case 'books_update': return Books.update(body, ctx);
    case 'books_archive': return Books.archive(body, ctx);
    case 'books_add_unit': return Books.addUnit(body, ctx);
    case 'books_update_unit': return Books.updateUnit(body, ctx);
    case 'books_reorder_units': return Books.reorderUnits(body, ctx);

    // Programs
    case 'programs_list': return Programs.list(body, ctx);
    case 'programs_get': return Programs.get(body, ctx);
    case 'programs_create': return Programs.create(body, ctx);
    case 'programs_update': return Programs.update(body, ctx);
    case 'programs_archive': return Programs.archive(body, ctx);
    case 'programs_toggle_publish': return Programs.togglePublish(body, ctx);
    case 'programs_clone': return Programs.clone(body, ctx);
    case 'programs_link_book': return Programs.linkBook(body, ctx);
    case 'programs_unlink_book': return Programs.unlinkBook(body, ctx);

    // Groups
    case 'groups_list': return Groups.list(body, ctx);
    case 'groups_create': return Groups.create(body, ctx);
    case 'groups_update': return Groups.update(body, ctx);
    case 'groups_archive': return Groups.archive(body, ctx);
    case 'groups_list_members': return Groups.listMembers(body, ctx);
    case 'groups_add_member': return Groups.addMember(body, ctx);
    case 'groups_remove_member': return Groups.removeMember(body, ctx);
    case 'groups_transfer_student': return Groups.transferStudent(body, ctx);

    // Enrollments
    case 'enrollments_list': return Enrollments.list(body, ctx);
    case 'enrollments_get': return Enrollments.get(body, ctx);
    case 'enrollments_create': return Enrollments.create(body, ctx);
    case 'enrollments_update_status': return Enrollments.updateStatus(body, ctx);
    case 'enrollments_mine': return Enrollments.mine(body, ctx);

    // Listening
    case 'listening_list': return Listening.list(body, ctx);
    case 'listening_create': return Listening.create(body, ctx);

    // Tests
    case 'tests_list': return Tests.list(body, ctx);
    case 'tests_create': return Tests.create(body, ctx);
    case 'tests_record_result': return Tests.recordResult(body, ctx);
    case 'tests_results_list': return Tests.listResults(body, ctx);

    // Notifications
    case 'notifications_list': return Notifications.list(body, ctx);
    case 'notifications_mark_read': return Notifications.markRead(body, ctx);

    default: throw new Error('الإجراء غير معروف: ' + action);
  }
}

var AUTH_PUBLIC_ACTIONS = {
  'auth_signup': true,
  'auth_login': true,
};
