import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-primary-500 ${className}`} aria-hidden />;
}

export function LoadingState({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status" aria-live="polite">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-primary-500 dark:text-primary-300">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-800/50 text-primary-400 dark:text-primary-300">
        <Icon className="h-7 w-7" />
      </div>
      <p className="section-title">{title}</p>
      {description && <p className="max-w-sm text-sm text-primary-500 dark:text-primary-300">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-fade-in" role="alert">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 dark:bg-error-900/40 text-error-500 dark:text-error-300">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M4.93 19h14.14a1 1 0 00.87-1.5L12.87 4a1 1 0 00-1.74 0L4.06 17.5A1 1 0 004.93 19z" />
        </svg>
      </div>
      <p className="max-w-sm text-sm text-error-600 dark:text-error-300">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-outline mt-1">إعادة المحاولة</button>}
    </div>
  );
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-200',
  approved: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-200',
  active: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-200',
  suspended: 'bg-error-100 text-error-700 dark:bg-error-900/40 dark:text-error-200',
  rejected: 'bg-error-100 text-error-700 dark:bg-error-900/40 dark:text-error-200',
  completed: 'bg-primary-100 text-primary-700 dark:bg-primary-800/60 dark:text-primary-200',
  ready_for_test: 'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-200',
  tested: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200',
  passed: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-200',
  failed: 'bg-error-100 text-error-700 dark:bg-error-900/40 dark:text-error-200',
  graduated: 'bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-200',
  archived: 'bg-primary-100/60 text-primary-500 dark:bg-primary-800/40 dark:text-primary-400',
};

const statusLabels: Record<string, string> = {
  pending: 'بانتظار الموافقة',
  approved: 'معتمد',
  active: 'نشط',
  suspended: 'موقوف',
  rejected: 'مرفوض',
  completed: 'مكتمل',
  ready_for_test: 'جاهز للاختبار',
  tested: 'تم اختباره',
  passed: 'ناجح',
  failed: 'راسب',
  graduated: 'متخرج',
  archived: 'مؤرشف',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = statusColors[status] ?? 'bg-primary-100 text-primary-700 dark:bg-primary-800/60 dark:text-primary-200';
  const label = statusLabels[status] ?? status;
  return <span className={`badge ${cls}`}>{label}</span>;
}
