import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { LoadingState } from '@/components/ui/Feedback';

export function ProtectedRoute({ children, allow }: { children: ReactNode; allow: ('student' | 'supervisor' | 'manager')[] }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="جارٍ التحقق من الجلسة…" />;

  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (!profile) return <LoadingState label="جارٍ تحميل الملف الشخصي…" />;

  if (profile.status === 'pending') return <Navigate to="/pending" replace />;
  if (profile.status === 'suspended' || profile.status === 'rejected') return <Navigate to="/suspended" replace />;

  if (!allow.includes(profile.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
