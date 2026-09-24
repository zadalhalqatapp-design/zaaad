import { useCallback, useRef, useState } from 'react';
import { Play, Headphones, Image as ImageIcon, Check } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { AudioPlayer } from './AudioPlayer';
import { HadithImageViewer } from './HadithImageViewer';
import { api } from '@/api';
import type { Hadith, ProgressRecord, AppSettings, MediaType } from '@/types';

interface MediaViewerProps {
  hadith: Hadith;
  progress?: ProgressRecord;
  settings?: AppSettings | null;
  /** يُستدعى بعد كل حفظ ناجح للتقدّم في الخادم لتحديث واجهة المستخدم */
  onProgressSaved?: () => void;
}

const DEFAULT_THRESHOLD = 90;

export function MediaViewer({ hadith, progress, settings, onProgressSaved }: MediaViewerProps) {
  const tabs: { key: MediaType; label: string; icon: typeof Play; available: boolean; done?: boolean }[] = [
    { key: 'video', label: 'الفيديو', icon: Play, available: !!hadith.youtubeUrl, done: progress?.watched },
    { key: 'audio', label: 'الصوت', icon: Headphones, available: !!hadith.audioUrl, done: progress?.listened },
    { key: 'pdf', label: 'صورة الحديث', icon: ImageIcon, available: !!hadith.pdfUrl, done: progress?.read },
  ];
  const firstAvailable = tabs.find((t) => t.available)?.key || 'video';
  const [tab, setTab] = useState<MediaType>(firstAvailable);

  const videoThreshold = Number(settings?.videoCompletionThreshold) || DEFAULT_THRESHOLD;
  const audioThreshold = Number(settings?.audioCompletionThreshold) || DEFAULT_THRESHOLD;

  // يمنع إرسال طلب حفظ لكل نبضة تشغيل — يُرسل كل بضع ثوانٍ فقط، أو فورًا عند الإكمال/الإيقاف
  const lastSaveRef = useRef<Record<MediaType, number>>({ video: 0, audio: 0, pdf: 0 });

  const save = useCallback(
    (mediaType: MediaType, data: Record<string, unknown>) => {
      return api
        .saveMediaProgress(hadith.id, mediaType, data)
        .then(() => onProgressSaved?.())
        .catch(() => {});
    },
    [hadith.id, onProgressSaved],
  );

  const throttledSave = useCallback(
    (mediaType: MediaType, percent: number, extra: Record<string, unknown>, throttleMs: number) => {
      const now = Date.now();
      if (percent < 100 && now - lastSaveRef.current[mediaType] < throttleMs) return;
      lastSaveRef.current[mediaType] = now;
      save(mediaType, { percent: Math.round(percent), ...extra });
    },
    [save],
  );

  const flushSave = useCallback(
    (mediaType: MediaType, percent: number, extra: Record<string, unknown>) => {
      lastSaveRef.current[mediaType] = Date.now();
      save(mediaType, { percent: Math.round(percent), ...extra });
    },
    [save],
  );

  // صورة الحديث ليست إنجازًا موزونًا (لا نسبة)؛ فتح الصورة بنجاح يكفي لتعليمها "مُطَّلَع عليها"
  const markRead = useCallback(() => {
    api.saveProgress(hadith.id, 'read', true).then(() => onProgressSaved?.()).catch(() => {});
  }, [hadith.id, onProgressSaved]);

  return (
    <div>
      <div className="flex gap-1.5 mb-3 border-b border-outline-variant overflow-x-auto">
        {tabs.filter((t) => t.available).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon size={16} /> {t.label}
              {t.done && <Check size={13} className="text-success-600" />}
            </button>
          );
        })}
      </div>

      {tab === 'video' && hadith.youtubeUrl && (
        <VideoPlayer
          key={hadith.id + '-video'}
          src={hadith.youtubeUrl}
          initialPosition={progress?.videoPosition}
          alreadyWatched={progress?.watched}
          onProgress={(percent, position) => throttledSave('video', percent, { position }, 5000)}
          onFlush={(percent, position) => flushSave('video', percent, { position })}
        />
      )}
      {tab === 'audio' && hadith.audioUrl && (
        <AudioPlayer
          key={hadith.id + '-audio'}
          src={hadith.audioUrl}
          initialPosition={progress?.audioPosition}
          onProgress={(percent, position) => throttledSave('audio', percent, { position }, 5000)}
          onFlush={(percent, position) => flushSave('audio', percent, { position })}
        />
      )}
      {tab === 'pdf' && hadith.pdfUrl && (
        <HadithImageViewer
          key={hadith.id + '-image'}
          src={hadith.pdfUrl}
          alreadyRead={progress?.read}
          onRead={markRead}
        />
      )}

      <p className="text-[11px] text-on-surface-variant mt-2">
        {tab === 'pdf'
          ? 'صورة الحديث مادة مساعدة للاطلاع فقط — لا تدخل في نسبة الإنجاز.'
          : `يُعتبر السماع مكتملًا تلقائيًا بعد ${tab === 'video' ? videoThreshold : audioThreshold}% — الفيديو أو الصوت، أيهما أولًا.`}
      </p>
    </div>
  );
}
