import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Maximize, Minimize, AlertCircle, RefreshCw } from 'lucide-react';
import { ProgressBar, SpeedMenu, formatTime } from './PlayerControls';
import { isYouTubeUrl, getYouTubeId, toStreamableUrl, loadYouTubeApi, type YTPlayerInstance } from '@/lib/media';

export interface VideoPlayerProps {
  src: string;
  initialPosition?: number;
  /** يُستدعى بشكل دوري أثناء التشغيل (نسبة 0-100، الموضع بالثواني) */
  onProgress: (percent: number, position: number) => void;
  /** يُستدعى فورًا عند الإيقاف المؤقت/الانتهاء/إغلاق المشغّل لحفظ نقطة التوقف بدقة */
  onFlush: (percent: number, position: number) => void;
}

export function VideoPlayer(props: VideoPlayerProps) {
  const ytId = isYouTubeUrl(props.src) ? getYouTubeId(props.src) : null;
  if (ytId) return <YouTubeVideoPlayer {...props} videoId={ytId} />;
  return <NativeVideoPlayer {...props} src={toStreamableUrl(props.src)} />;
}

function useFullscreen(containerRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handler = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [containerRef]);
  const toggle = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen?.();
  }, [containerRef]);
  return { isFullscreen, toggle };
}

function NativeVideoPlayer({ src, initialPosition = 0, onProgress, onFlush }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [rate, setRate] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const resumedRef = useRef(false);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoadedMeta = () => {
      setDuration(v.duration || 0);
      setLoading(false);
      if (!resumedRef.current && initialPosition > 1 && initialPosition < (v.duration || 0) - 1) {
        v.currentTime = initialPosition;
      }
      resumedRef.current = true;
    };
    const onTime = () => {
      setCurrent(v.currentTime);
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
      if (v.duration) onProgress((v.currentTime / v.duration) * 100, v.currentTime);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      onFlush(v.duration ? (v.currentTime / v.duration) * 100 : 0, v.currentTime);
    };
    const onEnded = () => {
      setPlaying(false);
      onFlush(100, v.duration || v.currentTime);
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onErr = () => {
      setError(true);
      setLoading(false);
    };

    v.addEventListener('loadedmetadata', onLoadedMeta);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEnded);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('error', onErr);
    return () => {
      v.removeEventListener('loadedmetadata', onLoadedMeta);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('error', onErr);
    };
  }, [initialPosition, onProgress, onFlush]);

  // حفظ فوري عند إغلاق المشغّل (تغيير التبويب/الخروج)
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v && v.duration) onFlush((v.currentTime / v.duration) * 100, v.currentTime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => setError(true));
    else v.pause();
  };
  const skip = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0);
  };
  const seek = (time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, time), v.duration || 0);
  };
  const changeRate = (r: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = r;
    setRate(r);
  };
  const retry = () => {
    setError(false);
    setLoading(true);
    videoRef.current?.load();
  };

  return (
    <div ref={containerRef} dir="ltr" className="relative bg-black rounded-xl overflow-hidden group">
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        className="w-full aspect-video bg-black"
        onClick={togglePlay}
      />
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white text-sm px-4 text-center">
          <AlertCircle size={28} />
          <p>تعذّر تحميل الفيديو. تحقّق من اتصالك بالإنترنت.</p>
          <button onClick={retry} className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg">
            <RefreshCw size={14} /> إعادة المحاولة
          </button>
        </div>
      )}
      {!loading && !playing && !error && (
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center" aria-label="تشغيل">
          <span className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play size={28} className="text-black ml-1" />
          </span>
        </button>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 mb-1.5">
          <ProgressBar current={current} duration={duration} onSeek={seek} buffered={buffered} />
        </div>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-1">
            <button onClick={() => skip(-10)} className="p-1.5 hover:bg-white/15 rounded-lg" aria-label="تأخير 10 ثوان"><RotateCcw size={18} /></button>
            <button onClick={togglePlay} className="p-1.5 hover:bg-white/15 rounded-lg" aria-label="تشغيل/إيقاف">{playing ? <Pause size={20} /> : <Play size={20} />}</button>
            <button onClick={() => skip(10)} className="p-1.5 hover:bg-white/15 rounded-lg" aria-label="تقديم 10 ثوان"><RotateCw size={18} /></button>
            <span className="text-xs font-mono ml-1 tabular-nums">{formatTime(current)} / {formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-1">
            <SpeedMenu rate={rate} onChange={changeRate} />
            <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/15 rounded-lg" aria-label="ملء الشاشة">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function YouTubeVideoPlayer({ videoId, initialPosition = 0, onProgress, onFlush }: VideoPlayerProps & { videoId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState(false);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !mountRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(mountRef.current, {
        videoId,
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, iv_load_policy: 3, fs: 0, playsinline: 1 },
        events: {
          onReady: () => {
            setReady(true);
            const p = playerRef.current;
            if (!p) return;
            setDuration(p.getDuration() || 0);
            if (initialPosition > 1) p.seekTo(initialPosition, true);
          },
          onStateChange: (e: { data: number }) => {
            const p = playerRef.current;
            if (!p) return;
            if (e.data === 1) setPlaying(true);
            else if (e.data === 2) {
              setPlaying(false);
              const d = p.getDuration() || 0;
              const c = p.getCurrentTime() || 0;
              onFlush(d ? (c / d) * 100 : 0, c);
            } else if (e.data === 0) {
              setPlaying(false);
              onFlush(100, p.getDuration() || 0);
            }
          },
          onError: () => setError(true),
        },
      });
    });
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
      playerRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if (!ready) return;
    pollRef.current = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== 'function') return;
      const c = p.getCurrentTime() || 0;
      const d = p.getDuration() || 0;
      setCurrent(c);
      if (d) {
        setDuration(d);
        onProgress((c / d) * 100, c);
      }
    }, 1000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [ready, onProgress]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.getPlayerState() === 1) p.pauseVideo();
    else p.playVideo();
  };
  const skip = (delta: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(Math.min(Math.max(0, p.getCurrentTime() + delta), p.getDuration()), true);
  };
  const seek = (time: number) => playerRef.current?.seekTo(time, true);
  const changeRate = (r: number) => {
    playerRef.current?.setPlaybackRate(r);
    setRate(r);
  };

  return (
    <div ref={containerRef} dir="ltr" className="relative bg-black rounded-xl overflow-hidden group aspect-video">
      <div className="absolute inset-0 pointer-events-none">
        <div ref={mountRef} className="w-full h-full" />
      </div>
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white text-sm px-4 text-center">
          <AlertCircle size={28} /><p>تعذّر تحميل الفيديو.</p>
        </div>
      )}
      <button onClick={togglePlay} className="absolute inset-0" aria-label="تشغيل/إيقاف" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 mb-1.5">
          <ProgressBar current={current} duration={duration} onSeek={seek} />
        </div>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-1">
            <button onClick={() => skip(-10)} className="p-1.5 hover:bg-white/15 rounded-lg" aria-label="تأخير 10 ثوان"><RotateCcw size={18} /></button>
            <button onClick={togglePlay} className="p-1.5 hover:bg-white/15 rounded-lg" aria-label="تشغيل/إيقاف">{playing ? <Pause size={20} /> : <Play size={20} />}</button>
            <button onClick={() => skip(10)} className="p-1.5 hover:bg-white/15 rounded-lg" aria-label="تقديم 10 ثوان"><RotateCw size={18} /></button>
            <span className="text-xs font-mono ml-1 tabular-nums">{formatTime(current)} / {formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-1">
            <SpeedMenu rate={rate} onChange={changeRate} />
            <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/15 rounded-lg" aria-label="ملء الشاشة">
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
