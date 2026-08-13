import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, AlertCircle, RefreshCw, Music2 } from 'lucide-react';
import { ProgressBar, SpeedMenu, formatTime } from './PlayerControls';
import { toStreamableUrl } from '@/lib/media';

export interface AudioPlayerProps {
  src: string;
  initialPosition?: number;
  onProgress: (percent: number, position: number) => void;
  onFlush: (percent: number, position: number) => void;
}

export function AudioPlayer({ src, initialPosition = 0, onProgress, onFlush }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [rate, setRate] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const resumedRef = useRef(false);
  const streamUrl = toStreamableUrl(src);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onLoadedMeta = () => {
      setDuration(a.duration || 0);
      setLoading(false);
      if (!resumedRef.current && initialPosition > 1 && initialPosition < (a.duration || 0) - 1) {
        a.currentTime = initialPosition;
      }
      resumedRef.current = true;
    };
    const onTime = () => {
      setCurrent(a.currentTime);
      if (a.buffered.length) setBuffered(a.buffered.end(a.buffered.length - 1));
      if (a.duration) onProgress((a.currentTime / a.duration) * 100, a.currentTime);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      onFlush(a.duration ? (a.currentTime / a.duration) * 100 : 0, a.currentTime);
    };
    const onEnded = () => {
      setPlaying(false);
      onFlush(100, a.duration || a.currentTime);
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onErr = () => {
      setError(true);
      setLoading(false);
    };

    a.addEventListener('loadedmetadata', onLoadedMeta);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded);
    a.addEventListener('waiting', onWaiting);
    a.addEventListener('playing', onPlaying);
    a.addEventListener('error', onErr);
    return () => {
      a.removeEventListener('loadedmetadata', onLoadedMeta);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('waiting', onWaiting);
      a.removeEventListener('playing', onPlaying);
      a.removeEventListener('error', onErr);
    };
  }, [initialPosition, onProgress, onFlush]);

  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a && a.duration) onFlush((a.currentTime / a.duration) * 100, a.currentTime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setError(true));
    else a.pause();
  };
  const skip = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.min(Math.max(0, a.currentTime + delta), a.duration || 0);
  };
  const seek = (time: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.min(Math.max(0, time), a.duration || 0);
  };
  const changeRate = (r: number) => {
    const a = audioRef.current;
    if (a) a.playbackRate = r;
    setRate(r);
  };
  const retry = () => {
    setError(false);
    setLoading(true);
    audioRef.current?.load();
  };

  return (
    <div dir="ltr" className="rounded-xl bg-primary-900 text-white p-4">
      <audio ref={audioRef} src={streamUrl} preload="metadata" />
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          {error ? <AlertCircle size={22} /> : <Music2 size={22} />}
        </div>
        <div className="flex-1 min-w-0">
          {error ? (
            <div className="flex items-center gap-2 text-sm">
              <span>تعذّر تحميل الملف الصوتي.</span>
              <button onClick={retry} className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 px-2 py-1 rounded-lg text-xs">
                <RefreshCw size={12} /> إعادة المحاولة
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button onClick={() => skip(-10)} className="p-1.5 hover:bg-white/15 rounded-lg" aria-label="تأخير 10 ثوان"><RotateCcw size={16} /></button>
                <button
                  onClick={togglePlay}
                  disabled={loading}
                  className="p-2 bg-white text-primary-900 rounded-full hover:bg-white/90 disabled:opacity-50"
                  aria-label="تشغيل/إيقاف"
                >
                  {loading ? (
                    <span className="w-4 h-4 block rounded-full border-2 border-primary-900/40 border-t-primary-900 animate-spin" />
                  ) : playing ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} />
                  )}
                </button>
                <button onClick={() => skip(10)} className="p-1.5 hover:bg-white/15 rounded-lg" aria-label="تقديم 10 ثوان"><RotateCw size={16} /></button>
                <ProgressBar current={current} duration={duration} onSeek={seek} buffered={buffered} />
                <SpeedMenu rate={rate} onChange={changeRate} />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-white/70 mt-1 tabular-nums">
                <span>{formatTime(current)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
