import { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { toStreamableUrl } from '@/lib/media';

export interface HadithImageViewerProps {
  src: string;
  /** كانت مُعلَّمة "مُطَّلَع عليها" من قبل — لا نرسل تحديثًا مكررًا عند إعادة فتحها. */
  alreadyRead?: boolean;
  onRead: () => void;
}

/**
 * صورة الحديث (النص والشرح مجتمعين في صورة واحدة يرفعها المدير) — تحلّ محل عارض PDF
 * متعدد الصفحات القديم. لا نسبة إنجاز مرتبطة بها (الاطلاع مادة مساعدة، ليس جزءًا من
 * الدرجة)؛ نكتفي بتعليمها "مُطَّلَع عليها" فور نجاح تحميل الصورة.
 */
export function HadithImageViewer({ src, alreadyRead, onRead }: HadithImageViewerProps) {
  const [error, setError] = useState(false);
  const markedRef = useRef(alreadyRead ?? false);

  useEffect(() => {
    markedRef.current = alreadyRead ?? false;
    setError(false);
  }, [src, alreadyRead]);

  const handleLoad = () => {
    if (markedRef.current) return;
    markedRef.current = true;
    onRead();
  };

  return (
    <div className="rounded-xl border border-outline-variant overflow-hidden bg-surface-dim">
      <div className="flex justify-center p-3 min-h-[200px]">
        {error ? (
          <div className="flex flex-col items-center gap-2 py-16 text-on-surface-variant text-sm">
            <AlertCircle size={26} />
            <p>تعذّر تحميل صورة الحديث.</p>
          </div>
        ) : (
          <img
            src={toStreamableUrl(src)}
            alt="صورة الحديث مع شرحه"
            className="max-w-full h-auto rounded-lg shadow-sm"
            onLoad={handleLoad}
            onError={() => setError(true)}
          />
        )}
      </div>
    </div>
  );
}
