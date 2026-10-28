import type { Book } from '@/types';
import { Library } from 'lucide-react';

/** شريط اختيار الكتاب — لا يظهر إن كان هناك كتاب واحد فقط. */
export function BookTabs({
  books,
  value,
  onChange,
}: {
  books: Book[];
  value?: string;
  onChange: (id: string) => void;
}) {
  if (books.length <= 1) return null;
  return (
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="الكتب">
      {books.map((b) => {
        const active = b.id === value;
        return (
          <button
            key={b.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(b.id)}
            className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              active
                ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                : 'border-outline-variant bg-surface text-on-surface hover:border-primary-300'
            }`}
          >
            <Library size={15} />
            {b.title}
          </button>
        );
      })}
    </div>
  );
}
