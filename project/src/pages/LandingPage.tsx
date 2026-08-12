import { Link } from 'react-router-dom';
import { BookOpen, Users, Award, Calendar, Layers, ShieldCheck, ArrowLeft } from 'lucide-react';

const features = [
  { icon: Layers, title: 'متعددة الكتب والبرامج', desc: 'أنشئ أي عدد من الكتب والبرامج والحلقات دون نسخ المحتوى.' },
  { icon: Calendar, title: 'خطط ذكية يومية', desc: 'خطة لكل طالب تتكيف مع إنجازه الفعلي وفق قواعد البرنامج.' },
  { icon: Users, title: 'إدارة الحلقات', desc: 'حلقات ومجموعات ومشرفون مع صلاحيات واضحة لكل دور.' },
  { icon: Award, title: 'شهادات وشهادات QR', desc: 'شهادات عربية احترافية قابلة للتحقق عبر رمز QR.' },
  { icon: ShieldCheck, title: 'صلاحيات مؤمّنة', desc: 'تحكم في الوصول على مستوى الخادم، لا مجرد إخفاء الأزرار.' },
  { icon: BookOpen, title: 'محتوى مرن', desc: 'حديث، سورة، درس، صفحة، نص، صوت، فيديو، PDF، أسئلة.' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50/60 via-white to-primary-50/40 dark:from-primary-900/40 dark:via-primary-900/20 dark:to-primary-900/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/assets/images/photo_2026-08-10_18-00-11.webp" alt="شعار زاد الحلقات" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <p className="font-bold text-primary-800 dark:text-primary-100 leading-tight">زاد الحلقات</p>
            <p className="text-xs text-primary-500 dark:text-primary-400 leading-tight">منصة الحلقات والبرامج</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost">تسجيل الدخول</Link>
          <Link to="/signup" className="btn-primary">إنشاء حساب</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-20 text-center">
        <span className="badge bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-200 mb-4">منصة تعليمية متكاملة</span>
        <h1 className="text-3xl sm:text-5xl font-bold text-primary-800 dark:text-primary-100 leading-tight mb-4">
          منصة متكاملة لإدارة الحلقات
          <br />
          وبرامج الحفظ والتعلّم
        </h1>
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-primary-600 dark:text-primary-300 mb-8">
          «زاد الحلقات» تتيح للمؤسسات إدارة الكتب والبرامج والحلقات والطلاب والاختبارات والشهادات في مكان واحد،
          بهندسة قابلة للتوسع وأداء عالٍ وتجربة هاتف متجاوبة.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup" className="btn-gold text-base px-6 py-3">ابدأ الآن</Link>
          <Link to="/login" className="btn-outline text-base px-6 py-3">دخول المنصة</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6 hover:shadow-card transition">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-800/50 text-primary-600 dark:text-primary-300 mb-3">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-primary-800 dark:text-primary-100 mb-1">{f.title}</h3>
              <p className="text-sm text-primary-500 dark:text-primary-300 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-primary-500 dark:text-primary-400">
        <p>زاد الحلقات — منصة تعليمية لإدارة الحلقات وبرامج الحفظ.</p>
        <p className="mt-1 flex items-center justify-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> صُممت بهندسة عربية بالكامل RTL
        </p>
      </footer>
    </div>
  );
}
