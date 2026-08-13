import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'error';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  filled: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm focus:ring-primary-600',
  tonal: 'bg-primary-50 text-primary-700 hover:bg-primary-100 focus:ring-primary-500',
  outlined: 'border border-primary-300 text-primary-700 hover:bg-primary-50 focus:ring-primary-500',
  text: 'text-primary-700 hover:bg-primary-50 focus:ring-primary-500',
  error: 'bg-error-600 text-white hover:bg-error-700 shadow-sm focus:ring-error-600',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2',
};

export function Button({
  variant = 'filled',
  size = 'md',
  loading = false,
  icon,
  fullWidth,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
