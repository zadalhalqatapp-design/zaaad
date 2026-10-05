import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, AlertCircle, Clock, XCircle, PauseCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from '@/api';
import { APPS_CONFIG } from '@/config';
import type { AccountStatus } from '@/types';

type Mode = 'login' | 'register';
type StatusInfo = { status: AccountStatus; reason?: string } | null;

/** ترويسة خضراء مقوّسة الأسفل بحلقات ذهبية خفيفة — نفس AuthHeader في التطبيق. */
function AuthHeader({ logoSize, title, subtitle }: { logoSize: number; title: string; subtitle: string }) {
  return (
    <header className="relative overflow-hidden rounded-b-[36px] bg-gradient-to-b from-primary-600 to-[#043d2e] pb-16 pt-7 text-center">
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="90%" cy="0" r="120" fill="none" stroke="#C9A227" strokeOpacity="0.10" strokeWidth="1.5" />
        <circle cx="90%" cy="0" r="180" fill="none" stroke="#C9A227" strokeOpacity="0.07" strokeWidth="1" />
        <circle cx="5%" cy="100%" r="90" fill="none" stroke="#C9A227" strokeOpacity="0.08" strokeWidth="1" />
      </svg>
      <div className="relative flex flex-col items-center">
        <img
          src={APPS_CONFIG.LOGO_URL}
          alt="شعار زاد الحلقات"
          style={{ width: logoSize, height: logoSize, borderRadius: logoSize / 4 }}
          className="bg-white object-cover shadow-lg"
        />
        <h1 className="mt-3.5 text-3xl font-bold text-white">{title}</h1>
        <p className="text-secondary-300">{subtitle}</p>
      </div>
    </header>
  );
}

export function AuthPage() {
  const { login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState<StatusInfo>(null);

  // form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setGender('');
    setConfirmPassword('');
    setShowPassword(false);
    setStatusInfo(null);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    resetForm();
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusInfo(null);
    try {
      const { user } = await login(email.trim(), password);
      notify(`أهلاً بك ${user.name}`, 'success');
      const home = user.role === 'admin' ? '/admin' : user.role === 'supervisor' ? '/supervisor' : '/student';
      navigate(home);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير معروف.';
      // Check for status-coded errors from backend
      if (err instanceof ApiError) {
        if (err.code === 'PENDING') setStatusInfo({ status: 'pending' });
        else if (err.code === 'REJECTED') setStatusInfo({ status: 'rejected', reason: err.message });
        else if (err.code === 'SUSPENDED') setStatusInfo({ status: 'suspended', reason: err.message });
        else notify(msg, 'error');
      } else {
        notify(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      notify('يرجى تعبئة الاسم والبريد الإلكتروني وكلمة المرور.', 'warning');
      return;
    }
    if (gender !== 'male' && gender !== 'female') {
      notify('يرجى اختيار الجنس (ذكر / أنثى).', 'warning');
      return;
    }
    if (password.length < 6) {
      notify('كلمة المرور يجب ألا تقل عن 6 أحرف.', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      notify('كلمتا المرور غير متطابقتين.', 'warning');
      return;
    }
    setLoading(true);
    try {
      await api.register({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined, gender });
      notify('تم إرسال طلب التسجيل بنجاح. سيصلك إشعار بعد مراجعته من المشرف.', 'success');
      resetForm();
      setMode('login');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء التسجيل.';
      notify(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const statusBanner = () => {
    if (!statusInfo) return null;
    const map: Record<string, { icon: typeof Clock; text: string; color: string }> = {
      pending: { icon: Clock, text: 'حسابك قيد المراجعة من قبل الإدارة. سيتم تفعيله بعد الموافقة.', color: 'bg-warning-50 text-warning-700 border-warning-200' },
      rejected: { icon: XCircle, text: `تم رفض حسابك.${statusInfo.reason ? ` السبب: ${statusInfo.reason}` : ''}`, color: 'bg-error-50 text-error-700 border-error-200' },
      suspended: { icon: PauseCircle, text: `تم إيقاف حسابك.${statusInfo.reason ? ` السبب: ${statusInfo.reason}` : ''}`, color: 'bg-error-50 text-error-700 border-error-200' },
    };
    const info = map[statusInfo.status];
    if (!info) return null;
    const Icon = info.icon;
    return (
      <div className={`mb-4 flex items-start gap-3 rounded-xl border p-3 text-sm ${info.color}`}>
        <Icon size={20} className="mt-0.5 shrink-0" />
        <p>{info.text}</p>
      </div>
    );
  };

  const eye = (): ReactNode => (
    <button
      type="button"
      onClick={() => setShowPassword((s) => !s)}
      className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-dim"
      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
  const pwType = showPassword ? 'text' : 'password';

  return (
    <div className="min-h-screen bg-surface-dim">
      {mode === 'login' ? (
        <AuthHeader logoSize={104} title="زاد الحلقات" subtitle="الأربعون القرآنية" />
      ) : (
        <AuthHeader logoSize={80} title="حساب طالب جديد" subtitle="سيُراجَع طلبك من المشرف قبل التفعيل" />
      )}

      <div className="mx-auto -mt-9 w-full max-w-md px-5 pb-6">
        <div className="animate-slide-up rounded-3xl bg-surface p-6 shadow-xl">
          {statusBanner()}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-primary-600">تسجيل الدخول</h2>
                <p className="text-sm text-on-surface-variant">أهلاً بك، أدخل بياناتك للمتابعة</p>
              </div>
              <Input
                label="البريد الإلكتروني"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                icon={<Mail size={18} />}
                placeholder="example@email.com"
                dir="ltr"
              />
              <Input
                label="كلمة المرور"
                type={pwType}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock size={18} />}
                trailing={eye()}
                placeholder="••••••••"
                dir="ltr"
              />
              <Button type="submit" fullWidth loading={loading} size="lg">
                دخول
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <Input
                label="الاسم الكامل"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                icon={<User size={18} />}
              />
              <Input
                label="البريد الإلكتروني"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                icon={<Mail size={18} />}
                placeholder="example@email.com"
                dir="ltr"
              />
              <div>
                <span className="mb-1.5 block text-sm font-medium text-on-surface-variant">الجنس (لصياغة الدعاء في شهادتك)</span>
                <div className="grid grid-cols-2 gap-2.5">
                  {([['male', 'ذكر'], ['female', 'أنثى']] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGender(value)}
                      className={`rounded-2xl border py-2.5 text-sm font-medium transition-colors ${
                        gender === value ? 'border-primary-600 bg-primary-600 text-white' : 'border-outline-variant bg-surface hover:border-primary-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                label="رقم الهاتف (اختياري)"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                icon={<Phone size={18} />}
                dir="ltr"
              />
              <Input
                label="كلمة المرور (6 أحرف على الأقل)"
                type={pwType}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock size={18} />}
                trailing={eye()}
                dir="ltr"
                minLength={6}
              />
              <Input
                label="تأكيد كلمة المرور"
                type={pwType}
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                icon={<Lock size={18} />}
                dir="ltr"
                minLength={6}
                error={confirmPassword && password !== confirmPassword ? 'كلمتا المرور غير متطابقتين' : undefined}
              />
              <div className="flex items-start gap-2 rounded-xl border border-secondary-200 bg-secondary-50 p-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-secondary-700" />
                <p className="text-xs text-secondary-800">
                  سيُراجَع طلبك من المشرف قبل التفعيل، ولن تتمكن من الدخول حتى تتم الموافقة.
                </p>
              </div>
              <Button type="submit" fullWidth loading={loading} size="lg">
                إرسال طلب التسجيل
              </Button>
            </form>
          )}
        </div>

        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          className="mx-auto mt-4 block text-sm font-semibold text-primary-600 hover:underline"
        >
          {mode === 'login' ? 'ليس لديك حساب؟ سجّل كطالب جديد' : 'لديك حساب بالفعل؟ سجّل الدخول'}
        </button>
      </div>
    </div>
  );
}
