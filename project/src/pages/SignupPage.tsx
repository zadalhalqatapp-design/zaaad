import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Feedback';
import { UserPlus, BookOpen, ShieldCheck, Users } from 'lucide-react';
import type { Profile } from '@/lib/types';

const roles: { value: Profile['role']; label: string; icon: typeof BookOpen; desc: string }[] = [
  { value: 'student', label: 'طالب', icon: BookOpen, desc: 'الاشتراك في البرامج والحفظ والتسميع' },
  { value: 'supervisor', label: 'مشرف', icon: Users, desc: 'متابعة الطلاب وتسجيل التسميع والاختبارات' },
  { value: 'manager', label: 'مدير', icon: ShieldCheck, desc: 'إدارة المنصة بالكامل (يتطلب اعتمادًا يدويًا)' },
];

export function SignupPage() {
  const { signUp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Profile['role']>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    setLoading(true);
    const { error: err } = await signUp(fullName.trim(), email.trim(), password, role);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    toast('success', role === 'manager' ? 'تم إنشاء حساب المدير. يمكنك الدخول بعد المراجعة.' : 'تم استلام طلبك. سيظهر بعد اعتماد الإدارة.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50/60 to-white dark:from-primary-900/40 dark:to-primary-900/20 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white font-bold text-2xl">ز</div>
          <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100">إنشاء حساب</h1>
          <p className="text-sm text-primary-500 dark:text-primary-400">اختر دورك واملأ بياناتك</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="fullName">الاسم الكامل</label>
            <input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" placeholder="الاسم الكامل" />
          </div>
          <div>
            <label className="label" htmlFor="email">البريد الإلكتروني</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="name@example.com" dir="ltr" />
          </div>
          <div>
            <label className="label" htmlFor="password">كلمة المرور</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="6 أحرف على الأقل" dir="ltr" />
          </div>

          <div>
            <span className="label">الدور</span>
            <div className="grid gap-2">
              {roles.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-right transition ${
                    role === r.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-800/40 ring-2 ring-primary-500/30'
                      : 'border-primary-200 dark:border-primary-700 hover:bg-primary-50/60 dark:hover:bg-primary-800/30'
                  }`}
                  aria-pressed={role === r.value}
                >
                  <r.icon className={`h-5 w-5 ${role === r.value ? 'text-primary-600 dark:text-primary-300' : 'text-primary-400'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary-800 dark:text-primary-100">{r.label}</p>
                    <p className="text-xs text-primary-500 dark:text-primary-400">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-error-600 dark:text-error-300 bg-error-50 dark:bg-error-900/30 rounded-lg px-3 py-2" role="alert">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {loading ? 'جارٍ الإنشاء…' : 'إنشاء الحساب'}
          </button>

          <p className="text-center text-sm text-primary-500 dark:text-primary-400">
            لديك حساب؟{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-300 font-medium hover:underline">تسجيل الدخول</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
