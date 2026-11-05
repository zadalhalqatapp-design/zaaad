import { useState } from 'react';

/** عرض تدريجي لقائمة طويلة: أول `pageSize` عنصرًا، ثم «عرض المزيد» يضيف دفعة أخرى. */
export function useShowMore<T>(items: T[], pageSize = 20) {
  const [count, setCount] = useState(pageSize);
  return {
    visible: items.length > count ? items.slice(0, count) : items,
    remaining: Math.max(0, items.length - count),
    showMore: () => setCount((n) => n + pageSize),
  };
}
