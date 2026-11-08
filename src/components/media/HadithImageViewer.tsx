import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { AlertCircle, Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { toStreamableUrl } from '@/lib/media';

export interface HadithImageViewerProps {
  src: string;
  /** كانت مُعلَّمة "مُطَّلَع عليها" من قبل — لا نرسل تحديثًا مكررًا عند إعادة فتحها. */
  alreadyRead?: boolean;
  onRead: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

/**
 * صورة الحديث (النص والشرح مجتمعين في صورة واحدة يرفعها المدير) — تحلّ محل عارض PDF
 * متعدد الصفحات القديم. لا نسبة إنجاز مرتبطة بها (الاطلاع مادة مساعدة، ليس جزءًا من
 * الدرجة)؛ نكتفي بتعليمها "مُطَّلَع عليها" فور نجاح تحميل الصورة.
 *
 * التكبير والسحب: أزرار + وعجلة الفأرة + قرصة بإصبعين + نقر مزدوج + سحب بإصبع/فأرة أثناء التكبير،
 * ووضع ملء الشاشة. التحويل بـ transform فقط (تسريع عتادي بلا إعادة تخطيط).
 */
export function HadithImageViewer({ src, alreadyRead, onRead }: HadithImageViewerProps) {
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [full, setFull] = useState(false);
  const markedRef = useRef(alreadyRead ?? false);
  const boxRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    markedRef.current = alreadyRead ?? false;
    setError(false);
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, [src, alreadyRead]);

  const clampPos = useCallback((x: number, y: number, s: number) => {
    const box = boxRef.current;
    if (!box || s <= 1) return { x: 0, y: 0 };
    const maxX = ((s - 1) * box.clientWidth) / 2;
    const maxY = ((s - 1) * box.clientHeight) / 2;
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }, []);

  const zoomTo = useCallback(
    (next: number) => {
      const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
      setScale(s);
      setPos((p) => clampPos(p.x, p.y, s));
    },
    [clampPos],
  );

  // عجلة الفأرة (مع Ctrl أو داخل ملء الشاشة) تكبّر بدل تمرير الصفحة؛ يلزم مستمع غير سلبي
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !full) return;
      e.preventDefault();
      zoomTo(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [full, scale, zoomTo]);

  // ملء الشاشة: Esc يغلق، ويُقفل تمرير الصفحة خلفه
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFull(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [full]);

  const handleLoad = () => {
    if (markedRef.current) return;
    markedRef.current = true;
    onRead();
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTo(pinchStart.current.scale * (dist / pinchStart.current.dist));
      dragged.current = true;
    } else if (pointers.current.size === 1 && scale > 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 0) dragged.current = true;
      setPos((p) => clampPos(p.x + dx, p.y + dy, scale));
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };

  const onDoubleClick = () => {
    if (dragged.current) return;
    if (scale > 1) {
      setScale(1);
      setPos({ x: 0, y: 0 });
    } else zoomTo(2.5);
  };

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  const toolbar = (
    <div className="flex items-center justify-between gap-2 border-b border-outline-variant bg-surface px-2 py-1.5">
      <span className="px-2 text-xs tabular-nums text-on-surface-variant">{Math.round(scale * 100)}%</span>
      <div className="flex items-center gap-1">
        <ToolBtn label="تصغير" onClick={() => zoomTo(scale / 1.3)} disabled={scale <= MIN_SCALE}><ZoomOut size={18} /></ToolBtn>
        <ToolBtn label="تكبير" onClick={() => zoomTo(scale * 1.3)} disabled={scale >= MAX_SCALE}><ZoomIn size={18} /></ToolBtn>
        <ToolBtn label="الحجم الأصلي" onClick={reset} disabled={scale === 1}><RotateCcw size={18} /></ToolBtn>
        <ToolBtn label={full ? 'إغلاق ملء الشاشة' : 'ملء الشاشة'} onClick={() => setFull((f) => !f)}>
          {full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </ToolBtn>
      </div>
    </div>
  );

  const stage = (
    <div
      ref={boxRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      className={`relative flex items-center justify-center overflow-hidden bg-surface-dim ${full ? 'flex-1' : 'min-h-[200px] p-3'} ${
        scale > 1 ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      style={{ touchAction: scale > 1 ? 'none' : 'pan-y' }}
    >
      {error ? (
        <div className="flex flex-col items-center gap-2 py-16 text-sm text-on-surface-variant">
          <AlertCircle size={26} />
          <p>تعذّر تحميل صورة الحديث.</p>
        </div>
      ) : (
        <img
          src={toStreamableUrl(src)}
          alt="صورة الحديث مع شرحه"
          decoding="async"
          draggable={false}
          className={`${full ? 'max-h-full' : ''} max-w-full h-auto select-none rounded-lg shadow-sm will-change-transform`}
          style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${scale})`, transition: pointers.current.size ? 'none' : 'transform 120ms ease-out' }}
          onLoad={handleLoad}
          onError={() => setError(true)}
        />
      )}
    </div>
  );

  if (full) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col bg-surface" role="dialog" aria-modal="true" aria-label="صورة الحديث">
        {toolbar}
        {stage}
        <p className="bg-surface px-3 py-2 text-center text-[11px] text-on-surface-variant">انقر مرتين للتكبير · اسحب للتحريك · Esc للإغلاق</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-dim">
      {!error && toolbar}
      {stage}
    </div>
  );
}

function ToolBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-dim hover:text-on-surface disabled:opacity-40"
    >
      {children}
    </button>
  );
}
