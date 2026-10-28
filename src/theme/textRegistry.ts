import { NAV_ITEMS, ROLE_LABELS } from '@/config/nav';

/**
 * سجلّ النصوص الثابتة القابلة للتخصيص من لوحة المدير.
 *
 * كيف يعمل: كل عنصر له مفتاح ثابت (يُخزَّن في الخادم) ونصه الافتراضي كما يظهر في الواجهة.
 * المكوّنات المشتركة (PageHeader/CardHeader/EmptyState/Dialog/القائمة الجانبية/شاشة الدخول)
 * تمرّر نصها عبر tr() فيُستبدل بنص المدير إن وُجد — فلا حاجة لتعديل أي صفحة على حدة، ولا
 * تُلمس النصوص الديناميكية (أسماء الطلاب والدورات والشهادات) لأنها ليست في هذا السجل.
 * النصوص الحساسة (الشهادات، بيانات الطلاب، رسائل الأمان) خارج السجل عمدًا، ويرفض الخادم مفاتيحها.
 */

export interface TextEntry {
  key: string;
  def: string;
  group: string;
  long?: boolean;
}

const G = {
  general: 'عام',
  nav: 'القائمة والتنقل',
  auth: 'الدخول والتسجيل',
  student: 'صفحات الطالب',
  mgmt: 'صفحات الإدارة والمتابعة',
  comms: 'الرسائل والإشعارات والملف الشخصي',
};

const fixed: TextEntry[] = [
  { key: 'app.name', def: 'زاد الحلقات', group: G.general },
  { key: 'app.tagline', def: 'الأربعون القرآنية', group: G.general },
  { key: 'role.admin', def: ROLE_LABELS.admin, group: G.general },
  { key: 'role.supervisor', def: ROLE_LABELS.supervisor, group: G.general },
  { key: 'role.student', def: ROLE_LABELS.student, group: G.general },
  { key: 'common.logout', def: 'تسجيل الخروج', group: G.nav },
  { key: 'common.loadMore', def: 'عرض المزيد', group: G.general },

  { key: 'auth.registerTitle', def: 'حساب طالب جديد', group: G.auth },
  { key: 'auth.registerSubtitle', def: 'سيُراجَع طلبك من المشرف قبل التفعيل', group: G.auth, long: true },
  { key: 'auth.toRegister', def: 'ليس لديك حساب؟ سجّل كطالب جديد', group: G.auth },
  { key: 'auth.toLogin', def: 'لديك حساب بالفعل؟ سجّل الدخول', group: G.auth },
  { key: 'auth.verifyLink', def: 'التحقق من صحة شهادة (مسح QR)', group: G.auth },

  { key: 'student.overall', def: 'نسبة الإنجاز الإجمالية', group: G.student },
  { key: 'student.formula', def: 'الحفظ 50% · السماع (صوت أو فيديو) 50%', group: G.student },
  { key: 'student.breakdown', def: 'تفصيل الإنجاز', group: G.student },
  { key: 'student.breakdownSub', def: 'تقدّمك في كل مهارة', group: G.student },
  { key: 'student.today', def: 'مقرر اليوم', group: G.student },
  { key: 'student.noToday', def: 'لا يوجد مقرر لليوم الحالي بعد', group: G.student },
  { key: 'student.latest', def: 'آخر الأحاديث', group: G.student },
  { key: 'student.latestSub', def: 'تابع تقدّمك في كل حديث', group: G.student },
  { key: 'student.noHadiths', def: 'لا توجد أحاديث متاحة', group: G.student },
  { key: 'student.noHadithsAtAll', def: 'لا توجد أحاديث', group: G.student },
  { key: 'student.noHadithsDesc', def: 'لم تتم إضافة أحاديث البرنامج بعد.', group: G.student, long: true },
  { key: 'student.overallTitle', def: 'الإنجاز الإجمالي', group: G.student },
  { key: 'student.skills', def: 'تفصيل المهارات', group: G.student },
  { key: 'student.certsTitle', def: 'شهاداتي', group: G.student },
  { key: 'student.certsSub', def: 'الشهادات التي حصلت عليها من البرنامج', group: G.student },
  { key: 'student.noCerts', def: 'لا توجد شهادات بعد', group: G.student },
  { key: 'student.noCertsDesc', def: 'ستظهر شهاداتك هنا بعد إكمال البرنامج وإصدارها من قبل المشرف.', group: G.student, long: true },
  { key: 'student.noContent', def: 'لا يوجد محتوى في هذا الكتاب بعد، أو لم يُعيَّن لك كتاب', group: G.student, long: true },

  { key: 'mgmt.dashSub', def: 'لوحة التحكم الإدارية', group: G.mgmt },
  { key: 'mgmt.recentRegs', def: 'آخر طلبات التسجيل', group: G.mgmt },
  { key: 'mgmt.noRegs', def: 'لا توجد طلبات حديثة', group: G.mgmt },
  { key: 'mgmt.recentOps', def: 'آخر العمليات', group: G.mgmt },
  { key: 'mgmt.noOps', def: 'لا توجد عمليات مسجّلة بعد', group: G.mgmt },
  { key: 'mgmt.studentsSub', def: 'إدارة جميع الطلاب', group: G.mgmt },
  { key: 'mgmt.progressNone', def: 'لا يوجد طلاب معتمدون بعد', group: G.mgmt },
  { key: 'mgmt.progressDetail', def: 'تفاصيل الإنجاز', group: G.mgmt },
  { key: 'mgmt.approvalsNone', def: 'لا توجد طلبات تسجيل قيد المراجعة', group: G.mgmt },
  { key: 'mgmt.approvalsDone', def: 'جميع الطلبات تمت معالجتها.', group: G.mgmt },
  { key: 'mgmt.issueSub', def: 'إصدار شهادات الإنجاز للطلاب', group: G.mgmt },
  { key: 'mgmt.booksSub', def: 'كتب الحفظ في البرنامج — لكل كتاب عدد أيام وعناصر يوميًا', group: G.mgmt, long: true },
  { key: 'mgmt.noBooks', def: 'لا توجد كتب', group: G.mgmt },
  { key: 'mgmt.noCycles', def: 'لا توجد دورات', group: G.mgmt },
  { key: 'mgmt.noCyclesDesc', def: 'ابدأ بإنشاء أول دورة لبرنامج زاد الحلقات.', group: G.mgmt, long: true },
  { key: 'mgmt.noItems', def: 'لا توجد عناصر', group: G.mgmt },
  { key: 'mgmt.noItemsDesc', def: 'ابدأ بإضافة محتوى هذا الكتاب.', group: G.mgmt },
  { key: 'mgmt.verifySub', def: 'امسح رمز QR للتأكد من صحة الشهادة', group: G.mgmt },

  { key: 'comms.messagesSub', def: 'نظام المراسلة المباشر', group: G.comms },
  { key: 'comms.noMessages', def: 'لا توجد رسائل', group: G.comms },
  { key: 'comms.noMessagesDesc', def: 'ستظهر رسائلك هنا.', group: G.comms },
  { key: 'comms.notifSub', def: 'إشعارات النظام', group: G.comms },
  { key: 'comms.noNotifs', def: 'لا توجد إشعارات', group: G.comms },
  { key: 'comms.newNotif', def: 'إنشاء إشعار جديد', group: G.comms },
  { key: 'comms.newNotifSub', def: 'أرسل إشعارًا للطلاب أو المشرفين', group: G.comms },
  { key: 'comms.profileSub', def: 'إدارة بياناتك الشخصية', group: G.comms },
];

// عناوين القائمة الجانبية/الصفحات: تُشتق من NAV_ITEMS مباشرة فلا تتكرر يدويًا
const seen = new Set<string>(fixed.map((e) => e.def));
const nav: TextEntry[] = [];
for (const item of NAV_ITEMS) {
  if (seen.has(item.label)) continue;
  seen.add(item.label);
  nav.push({ key: `nav.${item.path}`, def: item.label, group: G.nav });
}

export const TEXT_REGISTRY: TextEntry[] = [...fixed, ...nav];

export const TEXT_GROUPS: string[] = Object.values(G);

/** نص افتراضي → مفتاحه (للبحث العكسي في tr). */
export const KEY_BY_DEFAULT: Record<string, string> = Object.fromEntries(
  TEXT_REGISTRY.map((e) => [e.def, e.key]),
);

export const VALID_KEYS = new Set(TEXT_REGISTRY.map((e) => e.key));
