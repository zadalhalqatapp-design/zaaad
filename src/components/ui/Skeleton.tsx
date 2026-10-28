/** هياكل تحميل (Skeleton) بدل نص «جارٍ التحميل...»: تُظهر شكل الصفحة فورًا وتقلّل الإحساس بالانتظار. */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-outline-variant/60 ${className}`} aria-hidden />;
}

/** هيكل صفحة كاملة: عنوان + شريط بحث + صفوف بطاقات. */
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-label="جارٍ التحميل" className="animate-fade-in space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl border border-outline-variant bg-surface p-4">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="hidden h-8 w-20 sm:block" />
          </div>
        ))}
      </div>
      <span className="sr-only">جارٍ التحميل...</span>
    </div>
  );
}
