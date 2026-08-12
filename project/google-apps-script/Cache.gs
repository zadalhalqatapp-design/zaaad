/** تخزين مؤقت للبيانات العامة قليلة التغيير فقط. */

var AppCache = {
  getJson: function (key) {
    var value = CacheService.getScriptCache().get(key);
    if (!value) return null;
    try { return JSON.parse(value); } catch (error) { return null; }
  },

  putJson: function (key, value, seconds) {
    CacheService.getScriptCache().put(key, JSON.stringify(value), seconds || 300);
  },

  remove: function (key) {
    CacheService.getScriptCache().remove(key);
  },
};
