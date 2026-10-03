import type { ReactNode } from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

const styles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-50 text-primary-700 border-primary-200',
  success: 'bg-success-50 text-success-700 border-success-200',
  warning: 'bg-warning-50 text-warning-700 border-warning-200',
  error: 'bg-error-50 text-error-700 border-error-200',
  info: 'bg-accent-50 text-accent-700 border-accent-200',
  neutral: 'bg-surface-dim text-on-surface-variant border-outline-variant',
};

export function Badge({ children, variant = 'neutral' }: { children: ReactNode; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="text-on-surface-variant mb-3 opacity-60">{icon}</div>}
      <h3 className="text-base font-semibold text-on-surface mb-1">{title}</h3>
      {description && <p className="text-sm text-on-surface-variant max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, color = 'primary' }: { icon: ReactNode; label: string; value: string | number; color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
    info: 'bg-accent-50 text-accent-600',
    neutral: 'bg-surface-dim text-on-surface-variant',
  };
  return (
    <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-on-surface">{value}</p>
        <p className="text-sm text-on-surface-variant">{label}</p>
      </div>
    </div>
  );
}
