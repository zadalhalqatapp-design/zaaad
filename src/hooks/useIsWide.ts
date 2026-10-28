import { useSyncExternalStore } from 'react';

/** هل الشاشة بعرض لوح/حاسوب (≥768px)؟ دون ذلك نعرض بطاقات بدل الجداول. */
export function useIsWide(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(min-width: 768px)');
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia('(min-width: 768px)').matches,
    () => true,
  );
}
