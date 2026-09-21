/**
 * أدوات مساعدة لتشغيل الوسائط داخل المنصة دون تحويل المستخدم لأي موقع خارجي.
 * - يوتيوب: يُشغَّل عبر YouTube IFrame API المضمّن في نفس الصفحة (لا تنقّل خارجي).
 * - جوجل درايف: تُحوَّل روابط المشاركة إلى رابط بث مباشر يدعم Range requests
 *   (بث تدريجي فعلي بدل تنزيل الملف كاملاً).
 */

export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url || '');
}

export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null;
    if (u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1]?.split('/')[0] || null;
    if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/shorts/')[1]?.split('/')[0] || null;
    const v = u.searchParams.get('v');
    if (v) return v;
    return null;
  } catch {
    // ليس رابطًا صالحًا بصيغة URL — قد يكون معرّف الفيديو مباشرة
    return /^[a-zA-Z0-9_-]{6,}$/.test(url) ? url : null;
  }
}

export function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com/i.test(url || '');
}

function getDriveFileId(url: string): string | null {
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}

/** يحوّل أي رابط مشاركة (جوجل درايف مثلاً) إلى رابط بث مباشر يدعم التحميل الجزئي. */
export function toStreamableUrl(url: string): string {
  if (!url) return url;
  if (isGoogleDriveUrl(url)) {
    const id = getDriveFileId(url);
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  return url;
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ===== YouTube IFrame API (تحميل مرة واحدة فقط، بشكل كسول) =====

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayerInstance;
      PlayerState?: Record<string, number>;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
}

let ytApiPromise: Promise<void> | null = null;

export function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}
