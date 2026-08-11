/** تحقق مركزي من مدخلات حدود API. */

var Validation = {
  required: function (value, label) {
    if (value === null || value === undefined || String(value).trim() === '') throw new Error(label + ' مطلوب.');
    return value;
  },

  email: function (value) {
    var email = String(value || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('البريد الإلكتروني غير صحيح.');
    return email;
  },

  role: function (value) {
    if (['student', 'supervisor', 'manager'].indexOf(value) === -1) throw new Error('الدور غير صحيح.');
    return value;
  },

  id: function (value, label) {
    return this.required(value, label || 'المعرّف');
  },

  number: function (value, label, min, max) {
    var number = Number(value);
    if (!isFinite(number) || (min !== undefined && number < min) || (max !== undefined && number > max)) {
      throw new Error(label + ' غير صحيح.');
    }
    return number;
  },
};
