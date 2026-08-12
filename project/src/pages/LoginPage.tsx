import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui/Feedback';
import { BookOpen } from 'lucide-react';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    navigate(from ?? '/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50/60 to-white dark:from-primary-900/40 dark:to-primary-900/20 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/assets/images/photo_2026-08-10_18-00-11.webp" alt="شعار زاد الحلقات" className="mx-auto mb-3 h-14 w-14 rounded-2xl object-cover shadow-soft" />
          <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100">زاد الحلقات</h1>
          <p className="text-sm text-primary-500 dark:text-primary-400">تسجيل الدخول إلى حسابك</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">البريد الإلكتروني</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="name@example.com" dir="ltr" />
          </div>
          <div>
            <label className="label" htmlFor="password">كلمة المرور</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" dir="ltr" />
          </div>

          {error && <p className="text-sm text-error-600 dark:text-error-300 bg-error-50 dark:bg-error-900/30 rounded-lg px-3 py-2" role="alert">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
            {loading ? 'جارٍ الدخول…' : 'دخول'}
          </button>

          <p className="text-center text-sm text-primary-500 dark:text-primary-400">
            ليس لديك حساب؟{' '}
            <Link to="/signup" className="text-primary-600 dark:text-primary-300 font-medium hover:underline">إنشاء حساب</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
