interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
}

export function ProgressRing({ value, size = 120, stroke = 10, label }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-outline-variant)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-primary-600)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-on-surface">{Math.round(clamped)}%</span>
        {label && <span className="text-xs text-on-surface-variant mt-0.5">{label}</span>}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  className?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export function ProgressBar({ value, className = '', color = 'primary' }: ProgressBarProps) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-600',
    success: 'bg-success-600',
    warning: 'bg-warning-500',
    error: 'bg-error-600',
    info: 'bg-accent-600',
  };
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full h-2.5 bg-outline-variant rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
