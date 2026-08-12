export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/assets/images/photo_2026-08-10_18-00-11.webp" alt="شعار زاد الحلقات" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-soft" />
      {!compact && (
        <div>
          <p className="font-bold text-primary-800 dark:text-primary-100 leading-tight">زاد الحلقات</p>
          <p className="text-[11px] text-primary-500 dark:text-primary-400 leading-tight">منصة الحلقات والبرامج</p>
        </div>
      )}
    </div>
  );
}
