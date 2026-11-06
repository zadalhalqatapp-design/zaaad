import { useCallback, useEffect, useRef, useState } from 'react';
import { useToastOptional } from '@/components/ui/Toast';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * تحميل بيانات صفحة. سلوك مهم لسهولة الاستخدام:
 *  - التحميل الأول أو تغيّر المعطيات (deps): loading=true فتظهر هياكل التحميل.
 *  - reload() بعد إجراء (اعتماد/حذف/حفظ…): تحديث «صامت» يُبقي البيانات المعروضة (لا وميض ولا فقدان
 *    موضع التمرير أو نافذة مفتوحة) ثم يستبدلها عند وصول الجديدة.
 *  - الفشل لا يُخفى: يظهر إشعار بالخطأ بدل صفحة «فارغة» مضلّلة، وتبقى البيانات القديمة إن وُجدت.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });
  const reqId = useRef(0);
  const toast = useToastOptional();
  const notifyRef = useRef(toast?.notify);
  notifyRef.current = toast?.notify;

  const run = useCallback((silent: boolean) => {
    const currentReq = ++reqId.current;
    setState((prev) => (silent && prev.data !== null ? { ...prev, error: null } : { ...prev, loading: true, error: null }));
    fn()
      .then((data) => {
        if (reqId.current === currentReq) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (reqId.current !== currentReq) return;
        const msg = err instanceof Error ? err.message : 'حدث خطأ.';
        console.error('[useAsync]', msg, err);
        setState((prev) => ({ data: silent ? prev.data : null, loading: false, error: msg }));
        notifyRef.current?.(`تعذّر تحميل البيانات: ${msg}`, 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run(false);
    return () => { reqId.current++; };
  }, [run]);

  const reload = useCallback(() => run(true), [run]);

  return { ...state, reload };
}
