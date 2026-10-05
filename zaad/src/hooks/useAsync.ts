import { useCallback, useEffect, useRef, useState } from 'react';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });
  const reqId = useRef(0);

  const reload = useCallback(() => {
    const currentReq = ++reqId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fn()
      .then((data) => {
        if (reqId.current === currentReq) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (reqId.current === currentReq) {
          const msg = err instanceof Error ? err.message : 'حدث خطأ.';
          console.error('[useAsync]', msg, err);
          setState({ data: null, loading: false, error: msg });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
    return () => { reqId.current++; };
  }, [reload]);

  return { ...state, reload };
}
