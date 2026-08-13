import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, BookOpen, AlertCircle, Clock, XCircle, PauseCircle } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from '@/api';
import { APPS_CONFIG } from '@/config';
import type { AccountStatus } from '@/types';

type Mode = 'login' | 'register';
type StatusInfo = { status: AccountStatus; reason?: string } | null;

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

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
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
    setLoading(true);
    try {
      await api.register({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined });
      notify('تم إرسال طلب التسجيل بنجاح. حسابك قيد المراجعة.', 'success');
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
      <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm mb-4 ${info.color}`}>
        <Icon size={20} className="shrink-0 mt-0.5" />
        <p>{info.text}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Branding side */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary-700/40 rounded-full -translate-x-20 -translate-y-20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-500/20 rounded-full translate-x-32 translate-y-32 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <img src={APPS_CONFIG.LOGO_URL} alt="شعار زاد الحلقات" className="w-12 h-12 rounded-2xl object-cover bg-white" />
            <div>
              <h1 className="text-2xl font-bold">{APPS_CONFIG.APP_NAME}</h1>
              <p className="text-primary-200 text-sm">{APPS_CONFIG.APP_NAME_EN}</p>
            </div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold leading-relaxed">برنامج علمي مكثّف لحفظ الأحاديث النبوية</h2>
          <p className="text-primary-100 text-lg leading-loose">
            40 حديثًا في 20 يومًا — حديثان يوميًا مع الشرح والصوت والPDF، ومتابعة الإنجاز وإصدار الشهادات.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="bg-primary-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-secondary-400">40</p>
              <p className="text-sm text-primary-200">حديثًا</p>
            </div>
            <div className="bg-primary-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-secondary-400">20</p>
              <p className="text-sm text-primary-200">يومًا</p>
            </div>
            <div className="bg-primary-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-secondary-400">2</p>
              <p className="text-sm text-primary-200">حديث يوميًا</p>
            </div>
          </div>
        </div>
        <p className="relative text-primary-300 text-sm">© {new Date().getFullYear()} {APPS_CONFIG.APP_NAME}</p>
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface-dim">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src={APPS_CONFIG.LOGO_URL} alt="شعار زاد الحلقات" className="w-12 h-12 rounded-2xl object-cover bg-white" />
            <div>
              <h1 className="text-xl font-bold text-on-surface">{APPS_CONFIG.APP_NAME}</h1>
              <p className="text-xs text-on-surface-variant">{APPS_CONFIG.APP_NAME_EN}</p>
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-6 sm:p-8 animate-slide-up">
            <div className="flex gap-2 p-1 bg-surface-dim rounded-xl mb-6">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'login' ? 'bg-surface text-primary-700 shadow-sm' : 'text-on-surface-variant'}`}
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'register' ? 'bg-surface text-primary-700 shadow-sm' : 'text-on-surface-variant'}`}
              >
                حساب جديد
              </button>
            </div>

            {statusBanner()}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
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
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  icon={<Lock size={18} />}
                  placeholder="••••••••"
                  dir="ltr"
                />
                <Button type="submit" fullWidth loading={loading} size="lg">
                  تسجيل الدخول
                </Button>
                <p className="text-center text-xs text-on-surface-variant">
                  إذا لم يكن لديك حساب، يمكنك إنشاء حساب طالب جديد
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <Input
                  label="الاسم الكامل"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  icon={<User size={18} />}
                  placeholder="الاسم الكامل"
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
                <Input
                  label="رقم الجوال (اختياري)"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  icon={<Phone size={18} />}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
                <Input
                  label="كلمة المرور"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  icon={<Lock size={18} />}
                  placeholder="••••••••"
                  dir="ltr"
                  minLength={6}
                  hint="6 أحرف على الأقل"
                />
                <div className="flex items-start gap-2 p-3 bg-accent-50 rounded-xl border border-accent-200">
                  <AlertCircle size={18} className="text-accent-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-accent-700">
                    سيتم مراجعة طلبك من قبل الإدارة قبل تفعيل الحساب. لن تتمكن من الدخول حتى تتم الموافقة.
                  </p>
                </div>
                <Button type="submit" fullWidth loading={loading} size="lg" icon={<BookOpen size={18} />}>
                  إرسال طلب التسجيل
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
