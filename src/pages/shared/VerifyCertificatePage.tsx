import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, ScanLine, Camera, ImageUp, Loader2, X } from 'lucide-react';
import { api } from '@/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { VerifyCertificateResult } from '@/types';

// ---- قراءة QR: BarcodeDetector الأصلي إن وُجد (كروم/أندرويد)، وإلا مكتبة jsQR تُحمَّل عند الحاجة فقط ----

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type JsQr = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;

const JSQR_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';

function nativeDetector(): BarcodeDetectorLike | null {
  const Ctor = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

let jsQrPromise: Promise<JsQr> | null = null;
function loadJsQr(): Promise<JsQr> {
  const w = window as unknown as { jsQR?: JsQr };
  if (w.jsQR) return Promise.resolve(w.jsQR);
  if (!jsQrPromise) {
    jsQrPromise = new Promise<JsQr>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = JSQR_URL;
      s.async = true;
      s.onload = () => (w.jsQR ? resolve(w.jsQR) : reject(new Error('jsQR')));
      s.onerror = () => {
        jsQrPromise = null;
        reject(new Error('تعذّر تحميل قارئ الرموز. تحقق من الاتصال.'));
      };
      document.head.appendChild(s);
    });
  }
  return jsQrPromise;
}

async function decodeSource(source: HTMLVideoElement | HTMLImageElement, canvas: HTMLCanvasElement): Promise<string | null> {
  const native = nativeDetector();
  if (native) {
    try {
      const codes = await native.detect(source);
      if (codes[0]?.rawValue) return codes[0].rawValue;
      return null;
    } catch {
      /* نكمل بـ jsQR */
    }
  }
  const w = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const h = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!w || !h) return null;
  // نصغّر الإطار الكبير: القراءة أسرع وبطارية أقل دون فقدان دقة تُذكر
  const scale = Math.min(1, 720 / Math.max(w, h));
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const jsQR = await loadJsQr();
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(img.data, img.width, img.height)?.data ?? null;
}

/** محتوى الصفحة (مشترك بين صفحة لوحة التحكم والصفحة العامة /verify). */
export function VerifyCertificatePanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [scanning, setScanning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<VerifyCertificateResult | null>(null);

  if (!canvasRef.current && typeof document !== 'undefined') canvasRef.current = document.createElement('canvas');

  const stop = useCallback(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stop, [stop]);

  const verify = useCallback(async (code: string) => {
    setChecking(true);
    setError('');
    setResult(null);
    try {
      setResult(await api.verifyCertificate(code));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر التحقق من الشهادة.');
    } finally {
      setChecking(false);
    }
  }, []);

  const start = async () => {
    setError('');
    setResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('المتصفح لا يدعم الكاميرا. استخدم «اختيار صورة» بدلًا من ذلك.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      setScanning(true);
      // العنصر يظهر بعد setScanning؛ ننتظر دورة رسم واحدة
      await new Promise((r) => setTimeout(r, 50));
      const video = videoRef.current;
      if (!video) return stop();
      video.srcObject = stream;
      await video.play();
      // مسح كل 250ms (4 مرات/ثانية) يكفي ويوفّر المعالج والبطارية
      const tick = async () => {
        if (!streamRef.current || !videoRef.current || !canvasRef.current) return;
        if (videoRef.current.readyState >= 2) {
          try {
            const code = await decodeSource(videoRef.current, canvasRef.current);
            if (code) {
              stop();
              verify(code);
              return;
            }
          } catch (e) {
            if (e instanceof Error && e.message) {
              stop();
              setError(e.message);
              return;
            }
          }
        }
        timerRef.current = window.setTimeout(tick, 250);
      };
      tick();
    } catch {
      stop();
      setError('تعذّر فتح الكاميرا. اسمح باستخدامها من إعدادات المتصفح، أو اختر صورة للرمز.');
    }
  };

  const onFile = async (file?: File | null) => {
    if (!file || !canvasRef.current) return;
    setError('');
    setResult(null);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const code = await decodeSource(img, canvasRef.current);
      if (code) await verify(code);
      else setError('لم يُعثر على رمز QR في الصورة. جرّب صورة أوضح.');
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'تعذّر قراءة الصورة.');
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const cert = result?.valid ? result.certificate : undefined;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-sm text-on-surface-variant">
        وجّه الكاميرا إلى رمز QR أسفل الشهادة للتأكد من أنها صادرة فعلًا من زاد الحلقات.
      </p>

      {scanning ? (
        <Card padded={false} className="overflow-hidden">
          <div className="relative bg-black">
            <video ref={videoRef} muted playsInline className="aspect-square w-full object-cover" />
            <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-secondary-300/90" />
            <button
              type="button"
              onClick={stop}
              aria-label="إيقاف الكاميرا"
              className="absolute end-3 top-3 rounded-full bg-black/55 p-2 text-white hover:bg-black/70"
            >
              <X size={18} />
            </button>
          </div>
          <p className="flex items-center justify-center gap-2 py-3 text-sm text-on-surface-variant">
            <ScanLine size={16} /> جارٍ البحث عن الرمز...
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Button size="lg" icon={<Camera size={20} />} onClick={start} disabled={checking}>مسح بالكاميرا</Button>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary-300 px-6 py-3 text-base font-medium text-primary-700 hover:bg-primary-50">
            <ImageUp size={20} /> اختيار صورة للرمز
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
      )}

      {checking && (
        <p className="flex items-center justify-center gap-2 py-4 text-on-surface-variant">
          <Loader2 className="animate-spin" size={18} /> جارٍ التحقق...
        </p>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-error-50 p-4 text-error-700">
          <XCircle className="mt-0.5 shrink-0" size={22} /> <p className="text-sm">{error}</p>
        </div>
      )}

      {result && !result.valid && (
        <div className="flex items-start gap-3 rounded-2xl bg-error-50 p-4 text-error-700">
          <XCircle className="mt-0.5 shrink-0" size={24} />
          <div>
            <p className="font-bold">تعذّر التحقق من الشهادة</p>
            <p className="mt-1 text-sm">{result.reason || 'الرمز غير صالح.'}</p>
          </div>
        </div>
      )}

      {cert && (
        <div className="rounded-2xl border border-success-300 bg-success-50/70 p-5">
          <p className="mb-3 flex items-center gap-2 font-bold text-success-700">
            <CheckCircle2 size={24} /> شهادة صحيحة وصادرة من زاد الحلقات
          </p>
          <dl className="divide-y divide-success-200/70 text-sm">
            <Line label="الاسم" value={cert.studentName} />
            <Line label="رقم الشهادة" value={cert.certificateNumber} ltr />
            <Line label="الكتاب" value={cert.bookTitle} />
            {cert.cycleName && <Line label="الدورة" value={cert.cycleName} />}
            <Line label="نسبة الإنجاز" value={`${cert.progressPercent}%`} />
            {cert.grade && <Line label="التقدير" value={cert.grade} />}
            {cert.issueDate && <Line label="تاريخ الإصدار" value={cert.issueDate} />}
          </dl>
        </div>
      )}
    </div>
  );
}

function Line({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="font-semibold text-on-surface" dir={ltr ? 'ltr' : undefined}>{value}</dd>
    </div>
  );
}

/** صفحة داخل لوحة التحكم (لكل الأدوار). */
export function VerifyCertificatePage() {
  return (
    <div className="animate-fade-in">
      <PageHeader title="التحقق من شهادة" subtitle="امسح رمز QR للتأكد من صحة الشهادة" />
      <VerifyCertificatePanel />
    </div>
  );
}

/** الصفحة العامة /verify — بلا تسجيل دخول (لجهات خارجية كأولياء الأمور). */
export function PublicVerifyPage() {
  return (
    <div className="min-h-screen bg-surface-dim">
      <header className="rounded-b-[36px] bg-gradient-to-b from-primary-600 to-[#043d2e] px-4 pb-10 pt-8 text-center">
        <h1 className="text-2xl font-bold text-white">التحقق من شهادة</h1>
        <p className="mt-1 text-secondary-300">زاد الحلقات</p>
      </header>
      <main className="-mt-4 px-4 pb-10">
        <div className="mx-auto max-w-xl rounded-3xl bg-surface p-5 shadow-lg">
          <VerifyCertificatePanel />
        </div>
        <a href="/login" className="mx-auto mt-5 block text-center text-sm font-semibold text-primary-600 hover:underline">العودة لتسجيل الدخول</a>
      </main>
    </div>
  );
}
