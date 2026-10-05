import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft, ZoomIn, ZoomOut, Search, AlertCircle, RefreshCw, X } from 'lucide-react';
import { toStreamableUrl } from '@/lib/media';

export interface PdfViewerProps {
  src: string;
  initialPage?: number;
  onProgress: (percent: number, page: number, totalPages: number) => void;
  onFlush: (percent: number, page: number, totalPages: number) => void;
}

// أنواع مبسّطة لتفادي الاعتماد على أنواع pdfjs-dist الثقيلة عند البناء
interface PdfPageProxy {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void>; cancel?: () => void };
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
}
interface PdfDocProxy {
  numPages: number;
  getPage: (n: number) => Promise<PdfPageProxy>;
  destroy?: () => void;
}

export function PdfViewer({ src, initialPage = 1, onProgress, onFlush }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PdfDocProxy | null>(null);
  const renderTaskRef = useRef<{ cancel?: () => void } | null>(null);
  const [page, setPage] = useState(initialPage);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState('');
  const maxSeenPage = useRef(initialPage);
  const streamUrl = toStreamableUrl(src);

  const loadDoc = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      const doc = (await pdfjsLib.getDocument({ url: streamUrl }).promise) as unknown as PdfDocProxy;
      docRef.current = doc;
      setNumPages(doc.numPages);
      const startPage = Math.min(Math.max(1, initialPage), doc.numPages);
      setPage(startPage);
      maxSeenPage.current = startPage;
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl]);

  useEffect(() => {
    loadDoc();
    return () => {
      docRef.current?.destroy?.();
    };
  }, [loadDoc]);

  const renderPage = useCallback(async (pageNum: number, s: number) => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    try {
      renderTaskRef.current?.cancel?.();
      const pdfPage = await doc.getPage(pageNum);
      const viewport = pdfPage.getViewport({ scale: s });
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const task = pdfPage.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise;
    } catch {
      /* تجاهل — قد يكون العرض قد أُلغي بسبب تبديل الصفحة بسرعة */
    }
  }, []);

  useEffect(() => {
    if (!docRef.current) return;
    renderPage(page, scale);
    if (page > maxSeenPage.current) maxSeenPage.current = page;
    if (numPages) onProgress((maxSeenPage.current / numPages) * 100, page, numPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, scale, numPages]);

  useEffect(() => {
    return () => {
      if (numPages) onFlush((maxSeenPage.current / numPages) * 100, page, numPages);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (p: number) => setPage(Math.min(Math.max(1, p), numPages || 1));
  const zoomIn = () => setScale((s) => Math.min(3, s + 0.2));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.2));

  const runSearch = async () => {
    const doc = docRef.current;
    if (!doc || !query.trim() || !numPages) return;
    setSearching(true);
    setSearchMsg('');
    const q = query.trim().toLowerCase();
    try {
      for (let i = 1; i <= numPages; i++) {
        const p = ((page - 1 + i) % numPages) + 1; // بحث تدريجي بدءًا من الصفحة الحالية
        const pdfPage = await doc.getPage(p);
        const content = await pdfPage.getTextContent();
        const text = content.items.map((it) => it.str || '').join(' ').toLowerCase();
        if (text.includes(q)) {
          goTo(p);
          setSearchMsg(`تم العثور على "${query}" في صفحة ${p}`);
          setSearching(false);
          return;
        }
      }
      setSearchMsg('لم يتم العثور على نتائج.');
    } catch {
      setSearchMsg('تعذّر البحث داخل الملف.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="rounded-xl border border-outline-variant overflow-hidden bg-surface-dim">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-surface border-b border-outline-variant flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={() => goTo(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-surface-dim disabled:opacity-40" aria-label="الصفحة السابقة">
            <ChevronRight size={18} />
          </button>
          <div className="flex items-center gap-1 text-sm">
            <input
              type="number"
              value={page}
              onChange={(e) => goTo(Number(e.target.value) || 1)}
              className="w-12 text-center border border-outline-variant rounded-lg py-0.5"
              min={1}
              max={numPages || 1}
            />
            <span className="text-on-surface-variant">/ {numPages || '—'}</span>
          </div>
          <button onClick={() => goTo(page + 1)} disabled={page >= numPages} className="p-1.5 rounded-lg hover:bg-surface-dim disabled:opacity-40" aria-label="الصفحة التالية">
            <ChevronLeft size={18} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setSearchOpen((o) => !o)} className="p-1.5 rounded-lg hover:bg-surface-dim" aria-label="بحث"><Search size={18} /></button>
          <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-surface-dim" aria-label="تصغير"><ZoomOut size={18} /></button>
          <span className="text-xs text-on-surface-variant w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-surface-dim" aria-label="تكبير"><ZoomIn size={18} /></button>
        </div>
      </div>

      {searchOpen && (
        <div className="flex items-center gap-2 px-3 py-2 bg-surface border-b border-outline-variant">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="ابحث داخل الملف..."
            className="flex-1 border border-outline-variant rounded-lg px-2 py-1 text-sm"
          />
          <button onClick={runSearch} disabled={searching} className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
            {searching ? '...' : 'بحث'}
          </button>
          <button onClick={() => setSearchOpen(false)} className="p-1 text-on-surface-variant" aria-label="إغلاق البحث"><X size={16} /></button>
        </div>
      )}
      {searchMsg && <p className="px-3 py-1 text-xs text-on-surface-variant bg-surface border-b border-outline-variant">{searchMsg}</p>}

      <div className="overflow-auto max-h-[65vh] flex justify-center p-3 min-h-[200px]">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <span className="w-8 h-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center gap-2 py-16 text-on-surface-variant text-sm">
            <AlertCircle size={26} />
            <p>تعذّر تحميل ملف PDF.</p>
            <button onClick={loadDoc} className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg">
              <RefreshCw size={14} /> إعادة المحاولة
            </button>
          </div>
        )}
        {!loading && !error && <canvas ref={canvasRef} className="shadow-md max-w-full h-auto" />}
      </div>
    </div>
  );
}
