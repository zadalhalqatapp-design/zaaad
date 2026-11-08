import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';

interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  /** إجراء خطِر (حذف/استعادة…): يُلوَّن زر التأكيد بالأحمر. */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * بديل نافذة confirm() الخام في المتصفح: بنفس تصميم التطبيق (وألوان المظهر)، تعمل جيدًا على الهاتف
 * (ورقة سفلية)، وتدعم RTL. الاستعمال: `if (!(await confirm({ message: '...' }))) return;`
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    const o = typeof options === 'string' ? { message: options } : options;
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={!!opts}
        onClose={() => settle(false)}
        title={opts?.title ?? 'تأكيد'}
        size="sm"
        actions={
          <>
            <Button variant="text" onClick={() => settle(false)}>إلغاء</Button>
            <Button variant={opts?.destructive ? 'error' : 'filled'} onClick={() => settle(true)} autoFocus>
              {opts?.confirmText ?? 'تأكيد'}
            </Button>
          </>
        }
      >
        <div className="whitespace-pre-line text-sm leading-relaxed text-on-surface">{opts?.message}</div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
