import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, AlertCircle, Clock, XCircle, PauseCircle, Eye, EyeOff, Sparkles, BookOpenCheck } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from '@/api';
import { APPS_CONFIG } from '@/config';
import type { AccountStatus } from '@/types';

type Mode = 'login' | 'register';
type StatusInfo = { status: AccountStatus; reason?: string } | null;

function BrandPanel({ mode }: { mode: Mode }) {
  return (
    <section className="relative isolate flex min-h-[190px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#07533e] via-[#064633] to-[#032f23] px-6 py-6 text-white sm:px-9 sm:py-8 lg:min-h-full lg:px-11 lg:py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full border border-[#d9b85b]/20" />
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border border-[#d9b85b]/15" />
        <div className="absolute -bottom-36 -left-28 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute bottom-10 left-8 h-2 w-2 rounded-full bg-[#d9b85b]/70" />
        <div className="absolute right-[22%] top-[42%] h-1.5 w-1.5 rounded-full bg-white/50" />
      </div>
      <div className="relative z-10 flex items-center gap-3.5">
        <img src={APPS_CONFIG.LOGO_URL} alt="شعار زاد الحلقات" className="h-14 w-14 rounded-2xl bg-white object-cover shadow-lg ring-1 ring-white/25 sm:h-[68px] sm:w-[68px]" />
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#ecd68b]">منصة تعليمية قرآنية</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">زاد الحلقات</h1>
          <p className="mt-0.5 text-sm text-white/75">الأربعون القرآنية</p>
        </div>
      </div>
      <div className="relative z-10 mt-6 hidden max-w-sm lg:block">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-[#f1dfaa]"><Sparkles size={14} /> رحلة علم وإيمان</div>
        <h2 className="text-3xl font-bold leading-[1.5]">خطوةٌ نحو العلم،<br />وأثرٌ يبقى في القلب</h2>
        <p className="mt-3 max-w-xs text-sm leading-7 text-white/70">تعلّم الأحاديث، تابع تقدّمك، وواصل رحلتك القرآنية في بيئة تجمع بين البساطة والسكينة.</p>
      </div>
      <div className="relative z-10 mt-4 hidden items-center gap-2 text-xs text-white/65 lg:flex"><BookOpenCheck size={16} className="text-[#d9b85b]" /><span>{mode === 'login' ? 'مرحباً بعودتك إلى رحلتك التعليمية' : 'ابدأ رحلتك التعليمية معنا اليوم'}</span></div>
      <p className="relative z-10 mt-3 text-xs text-white/65 lg:hidden">الأربعون القرآنية · علمٌ ينير الطريق</p>
    </section>
  );
}

export function AuthPage() {
  const { login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState<StatusInfo>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setEmail(''); setPassword(''); setName(''); setPhone(''); setGender(''); setConfirmPassword(''); setShowPassword(false); setStatusInfo(null);
  };
  const switchMode = (nextMode: Mode) => { setMode(nextMode); resetForm(); };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setStatusInfo(null);
    try {
      const { user } = await login(email.trim(), password);
      notify(`أهلاً بك ${user.name}`, 'success');
      const home = user.role === 'admin' ? '/admin' : user.role === 'supervisor' ? '/supervisor' : '/student';
      navigate(home);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ غير معروف.';
      if (error instanceof ApiError) {
        if (error.code === 'PENDING') setStatusInfo({ status: 'pending' });
        else if (error.code === 'REJECTED') setStatusInfo({ status: 'rejected', reason: error.message });
        else if (error.code === 'SUSPENDED') setStatusInfo({ status: 'suspended', reason: error.message });
        else notify(message, 'error');
      } else notify(message, 'error');
    } finally { setLoading(false); }
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !password) { notify('يرجى تعبئة الاسم والبريد الإلكتروني وكلمة المرور.', 'warning'); return; }
    if (gender !== 'male' && gender !== 'female') { notify('يرجى اختيار الجنس (ذكر / أنثى).', 'warning'); return; }
    if (password.length < 6) { notify('كلمة المرور يجب ألا تقل عن 6 أحرف.', 'warning'); return; }
    if (password !== confirmPassword) { notify('كلمتا المرور غير متطابقتين.', 'warning'); return; }
    setLoading(true);
    try {
      await api.register({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined, gender });
      notify('تم إرسال طلب التسجيل بنجاح. سيصلك إشعار بعد مراجعته من المشرف.', 'success'); resetForm(); setMode('login');
    } catch (error) { notify(error instanceof Error ? error.message : 'حدث خطأ أثناء التسجيل.', 'error'); }
    finally { setLoading(false); }
  };

  const statusBanner = () => {
    if (!statusInfo) return null;
    const statusMap: Record<string, { icon: typeof Clock; text: string; color: string }> = {
      pending: { icon: Clock, text: 'حسابك قيد المراجعة من قبل الإدارة. سيتم تفعيله بعد الموافقة.', color: 'border-amber-200 bg-amber-50 text-amber-800' },
      rejected: { icon: XCircle, text: `تم رفض حسابك.${statusInfo.reason ? ` السبب: ${statusInfo.reason}` : ''}`, color: 'border-red-200 bg-red-50 text-red-800' },
      suspended: { icon: PauseCircle, text: `تم إيقاف حسابك.${statusInfo.reason ? ` السبب: ${statusInfo.reason}` : ''}`, color: 'border-red-200 bg-red-50 text-red-800' },
    };
    const info = statusMap[statusInfo.status]; if (!info) return null; const Icon = info.icon;
    return <div className={`mb-5 flex items-start gap-3 rounded-2xl border p-3.5 text-sm leading-6 ${info.color}`}><Icon size={19} className="mt-1 shrink-0" /><p>{info.text}</p></div>;
  };
  const passwordToggle = (): ReactNode => (
    <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-dim hover:text-primary-600" aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
  const passwordType = showPassword ? 'text' : 'password';

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f3ed] px-0 py-0 sm:px-5 sm:py-6 lg:flex lg:items-center lg:justify-center lg:px-8">
      <main className="mx-auto w-full max-w-6xl overflow-hidden bg-white shadow-[0_24px_80px_-32px_rgba(3,47,35,0.28)] sm:rounded-[30px] lg:grid lg:min-h-[680px] lg:grid-cols-[0.88fr_1.12fr] lg:border lg:border-[#e7e4d8]">
        <BrandPanel mode={mode} />
        <section className="flex items-center justify-center px-5 py-7 sm:px-9 sm:py-9 lg:px-12 lg:py-12">
          <div className="w-full max-w-[470px] animate-slide-up">
            <div className="mb-6 flex rounded-2xl bg-[#f5f5f0] p-1.5" role="tablist" aria-label="نوع الحساب">
              <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => mode !== 'login' && switchMode('login')} className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold transition-all ${mode === 'login' ? 'bg-white text-primary-700 shadow-sm' : 'text-on-surface-variant hover:text-primary-700'}`}>تسجيل الدخول</button>
              <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => mode !== 'register' && switchMode('register')} className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold transition-all ${mode === 'register' ? 'bg-white text-primary-700 shadow-sm' : 'text-on-surface-variant hover:text-primary-700'}`}>حساب جديد</button>
            </div>
            <div className="mb-6">
              <p className="mb-1 text-sm font-semibold text-secondary-600">{mode === 'login' ? 'مرحباً بعودتك' : 'أهلاً بك في زاد الحلقات'}</p>
              <h2 className="text-2xl font-bold tracking-tight text-[#18372d] sm:text-[28px]">{mode === 'login' ? 'سجّل الدخول إلى حسابك' : 'أنشئ حساب طالب جديد'}</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{mode === 'login' ? 'أدخل بياناتك لمتابعة رحلتك التعليمية.' : 'املأ البيانات التالية لإرسال طلب التسجيل للمراجعة.'}</p>
            </div>
            {statusBanner()}
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <Input label="البريد الإلكتروني" type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required icon={<Mail size={18} />} placeholder="example@email.com" dir="ltr" className="h-12 rounded-xl bg-[#fdfdfb] px-4 text-[15px]" />
                <Input label="كلمة المرور" type={passwordType} name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required icon={<Lock size={18} />} trailing={passwordToggle()} placeholder="أدخل كلمة المرور" dir="ltr" className="h-12 rounded-xl bg-[#fdfdfb] px-4 text-[15px]" />
                <div className="pt-1"><Button type="submit" fullWidth loading={loading} size="lg">تسجيل الدخول</Button></div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <Input label="الاسم الكامل" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required icon={<User size={18} />} placeholder="اكتب اسمك الكامل" className="h-11 rounded-xl bg-[#fdfdfb] px-4" />
                <Input label="البريد الإلكتروني" type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required icon={<Mail size={18} />} placeholder="example@email.com" dir="ltr" className="h-11 rounded-xl bg-[#fdfdfb] px-4" />
                <div>
                  <span className="mb-2 block text-sm font-medium text-on-surface">الجنس <span className="font-normal text-on-surface-variant">(لصياغة الدعاء في الشهادة)</span></span>
                  <div className="grid grid-cols-2 gap-3">
                    {([['male', 'ذكر'], ['female', 'أنثى']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={gender === value} onClick={() => setGender(value)} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${gender === value ? 'border-primary-600 bg-primary-600 text-white shadow-sm' : 'border-outline-variant bg-white text-on-surface hover:border-primary-400 hover:bg-primary-50'}`}>{label}</button>)}
                  </div>
                </div>
                <Input label="رقم الهاتف (اختياري)" type="tel" name="phone" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} icon={<Phone size={18} />} placeholder="05xxxxxxxx" dir="ltr" className="h-11 rounded-xl bg-[#fdfdfb] px-4" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="كلمة المرور" type={passwordType} name="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required icon={<Lock size={18} />} trailing={passwordToggle()} placeholder="6 أحرف على الأقل" dir="ltr" minLength={6} className="h-11 rounded-xl bg-[#fdfdfb] px-4 text-sm" />
                  <Input label="تأكيد كلمة المرور" type={passwordType} name="confirmPassword" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required icon={<Lock size={18} />} placeholder="أعد كتابة كلمة المرور" dir="ltr" minLength={6} error={confirmPassword && password !== confirmPassword ? 'كلمتا المرور غير متطابقتين' : undefined} className="h-11 rounded-xl bg-[#fdfdfb] px-4 text-sm" />
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-secondary-200 bg-secondary-50/70 p-3.5 text-secondary-900"><AlertCircle size={18} className="mt-0.5 shrink-0 text-secondary-700" /><p className="text-xs leading-5">سيُراجَع طلبك من المشرف قبل التفعيل، ولن تتمكن من الدخول حتى تتم الموافقة.</p></div>
                <Button type="submit" fullWidth loading={loading} size="lg">إرسال طلب التسجيل</Button>
              </form>
            )}
            <p className="mt-6 text-center text-sm text-on-surface-variant">{mode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
              <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="font-bold text-primary-700 underline-offset-4 transition hover:text-primary-500 hover:underline">{mode === 'login' ? 'سجّل كطالب جديد' : 'سجّل الدخول'}</button>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
