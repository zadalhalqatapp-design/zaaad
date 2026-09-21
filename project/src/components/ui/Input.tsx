import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  hint?: string;
}

export function Input({ label, error, icon, hint, className = '', id, ...rest }: InputProps) {
  const inputId = id || rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-on-surface">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">{icon}</span>}
        <input
          id={inputId}
          className={`w-full bg-surface border rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 transition-all ${icon ? 'pr-10' : ''} ${error ? 'border-error-400 focus:ring-error-500' : 'border-outline-variant focus:border-primary-500 focus:ring-primary-500/30'} ${className}`}
          {...rest}
        />
      </div>
      {error && <p className="text-xs text-error-600">{error}</p>}
      {hint && !error && <p className="text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', id, ...rest }: TextareaProps) {
  const inputId = id || rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-on-surface">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`w-full bg-surface border rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 transition-all resize-y min-h-[96px] ${error ? 'border-error-400 focus:ring-error-500' : 'border-outline-variant focus:border-primary-500 focus:ring-primary-500/30'} ${className}`}
        {...rest}
      />
      {error && <p className="text-xs text-error-600">{error}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, className = '', id, children, ...rest }: SelectProps) {
  const inputId = id || rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-on-surface">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={`w-full bg-surface border rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 transition-all ${error ? 'border-error-400 focus:ring-error-500' : 'border-outline-variant focus:border-primary-500 focus:ring-primary-500/30'} ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-xs text-error-600">{error}</p>}
    </div>
  );
}
