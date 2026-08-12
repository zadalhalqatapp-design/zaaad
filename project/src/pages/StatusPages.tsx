import { Link } from 'react-router-dom';
import { Clock, Ban, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function PendingPage() {
  const { signOut } = useAuth();
  return (
    <StatusPage
      icon={Clock}
      title="حسابك بانتظار الموافقة"
      message="تم استلام طلب التسجيل. سيتمكّن من الدخول بعد اعتماد الإدارة لحسابك."
      actionLabel="العودة لتسجيل الدخول"
      onAction={signOut}
      tone="warning"
    />
  );
}

export function SuspendedPage() {
  const { signOut } = useAuth();
  return (
    <StatusPage
      icon={Ban}
      title="تم إيقاف هذا الحساب"
      message="إذا كان لديك استفسار، تواصل مع إدارة المؤسسة."
      actionLabel="تسجيل الخروج"
      onAction={signOut}
      tone="error"
    />
  );
}

function StatusPage({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  tone,
}: {
  icon: typeof Clock;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => Promise<void> | void;
  tone: 'warning' | 'error';
}) {
  const colors = {
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-900/40 dark:text-warning-200',
    error: 'bg-error-50 text-error-600 dark:bg-error-900/40 dark:text-error-200',
  }[tone];

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-sm w-full p-8 text-center">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${colors}`}>
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-primary-800 dark:text-primary-100 mb-2">{title}</h1>
        <p className="text-sm text-primary-500 dark:text-primary-300 mb-6">{message}</p>
        <button onClick={onAction} className="btn-outline w-full">
          <ArrowLeft className="h-4 w-4" />
          {actionLabel}
        </button>
        <Link to="/login" className="block mt-3 text-xs text-primary-400 hover:underline">العودة لتسجيل الدخول</Link>
      </div>
    </div>
  );
}
