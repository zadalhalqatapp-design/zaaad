import type { ReactNode } from 'react';
import { useT } from '@/theme/store';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const t = useT();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">{t(title)}</h1>
        {subtitle && <p className="text-sm text-on-surface-variant mt-1">{t(subtitle)}</p>}
      </div>
      {action}
    </div>
  );
}
