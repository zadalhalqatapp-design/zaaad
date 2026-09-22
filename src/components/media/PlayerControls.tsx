import { useCallback, useEffect, useRef, useState } from 'react';

export { formatTime } from '@/lib/media';

interface ProgressBarProps {
  current: number;
  duration: number;
  onSeek: (time: number) => void;
  buffered?: number;
}

export function ProgressBar({ current, duration, onSeek, buffered = 0 }: ProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const ratioFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  useEffect(() => {
    if (dragRatio === null) return;
    const move = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      setDragRatio(ratioFromClientX(clientX));
    };
    const up = (e: MouseEvent | TouchEvent) => {
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
      const ratio = ratioFromClientX(clientX);
      setDragRatio(null);
      if (duration > 0) onSeek(ratio * duration);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [dragRatio, ratioFromClientX, duration, onSeek]);

  const activeRatio = dragRatio !== null ? dragRatio : duration > 0 ? current / duration : 0;
  const bufferedRatio = duration > 0 ? Math.min(1, buffered / duration) : 0;

  return (
    <div
      ref={trackRef}
      className="relative h-1.5 flex-1 rounded-full bg-white/25 cursor-pointer group/bar select-none"
      onMouseDown={(e) => setDragRatio(ratioFromClientX(e.clientX))}
      onTouchStart={(e) => setDragRatio(ratioFromClientX(e.touches[0].clientX))}
    >
      <div className="absolute inset-y-0 left-0 rounded-full bg-white/20" style={{ width: `${bufferedRatio * 100}%` }} />
      <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${activeRatio * 100}%` }} />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover/bar:opacity-100 transition-opacity"
        style={{ left: `calc(${activeRatio * 100}% - 6px)` }}
      />
    </div>
  );
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function SpeedMenu({ rate, onChange }: { rate: number; onChange: (r: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-white text-xs font-semibold px-2 py-1 rounded-md hover:bg-white/15 min-w-[2.5rem]"
      >
        {rate}×
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 rounded-lg overflow-hidden shadow-lg z-10">
          {RATES.map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => {
                onChange(r);
                setOpen(false);
              }}
              className={`block w-full px-4 py-1.5 text-xs text-center whitespace-nowrap ${
                r === rate ? 'bg-white/20 text-white font-bold' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {r}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
