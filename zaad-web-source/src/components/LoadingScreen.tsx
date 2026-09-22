export function LoadingScreen({ message = 'جارٍ التحميل...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface-dim">
      <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
      <p className="text-on-surface-variant text-sm">{message}</p>
    </div>
  );
}
