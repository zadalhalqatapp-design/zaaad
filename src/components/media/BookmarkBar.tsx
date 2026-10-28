import { useCallback, useEffect, useState } from 'react';
import { Bookmark, BookmarkPlus, X } from 'lucide-react';
import { formatTime } from './PlayerControls';

/**
 * علامات مرجعية للمشغّلات: يضيف الطالب علامة عند الموضع الحالي ويعود إليها بنقرة.
 * تُحفظ على هذا الجهاز (localStorage) لكل ملف وسائط — هي أداة مراجعة شخصية لا تدخل في الإنجاز،
 * ولا تحتاج لأي دعم من الخادم. في الفيديو يطبّق المشغّل قيد «لا تقدّم تجاوزًا لما شوهد» على الانتقال.
 */

const MAX_MARKS = 20;

function storageKey(id: string) {
  return `zad_bm:${id}`;
}

function load(id: string): number[] {
  try {
    const raw = localStorage.getItem(storageKey(id));
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((n): n is number => typeof n === 'number').sort((a, b) => a - b) : [];
  } catch {
    return [];
  }
}

export function BookmarkBar({
  id,
  current,
  onSeek,
  tone = 'dark',
}: {
  /** معرّف ثابت للملف (رابطه أو معرّف الفيديو). */
  id: string;
  current: number;
  onSeek: (seconds: number) => void;
  tone?: 'dark' | 'light';
}) {
  const [marks, setMarks] = useState<number[]>(() => load(id));
  useEffect(() => setMarks(load(id)), [id]);

  const save = useCallback(
    (next: number[]) => {
      setMarks(next);
      try {
        localStorage.setItem(storageKey(id), JSON.stringify(next));
      } catch {
        /* التخزين المحلي اختياري */
      }
    },
    [id],
  );

  const add = () => {
    const t = Math.floor(current);
    if (marks.some((m) => Math.abs(m - t) < 2)) return;
    save([...marks, t].sort((a, b) => a - b).slice(-MAX_MARKS));
  };

  const dark = tone === 'dark';
  return (
    <div dir="rtl" className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={add}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
          dark ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
        }`}
      >
        <BookmarkPlus size={14} /> علامة هنا ({formatTime(current)})
      </button>
      {marks.map((m) => (
        <span
          key={m}
          className={`inline-flex items-center overflow-hidden rounded-full text-xs ${
            dark ? 'bg-secondary-500/25 text-secondary-100' : 'bg-secondary-50 text-secondary-800'
          }`}
        >
          <button type="button" onClick={() => onSeek(m)} className="inline-flex items-center gap-1 py-1 ps-2.5 pe-1.5 hover:underline" dir="ltr">
            <Bookmark size={12} /> {formatTime(m)}
          </button>
          <button
            type="button"
            onClick={() => save(marks.filter((x) => x !== m))}
            aria-label="حذف العلامة"
            className="px-1.5 py-1 opacity-70 hover:opacity-100"
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}
