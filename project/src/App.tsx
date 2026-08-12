import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppShell } from '@/components/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { PendingPage, SuspendedPage } from '@/pages/StatusPages';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { SupervisorDashboard } from '@/pages/SupervisorDashboard';
import { ManagerDashboard } from '@/pages/ManagerDashboard';

function RoleRedirect() {
  const { profile } = useAuth();
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role === 'manager') return <Navigate to="/manager" replace />;
  if (profile.role === 'supervisor') return <Navigate to="/supervisor" replace />;
  return <Navigate to="/student" replace />;
}

function Shell({ children, allow }: { children: React.ReactNode; allow: ('student' | 'supervisor' | 'manager')[] }) {
  return (
    <ProtectedRoute allow={allow}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/pending" element={<PendingPage />} />
              <Route path="/suspended" element={<SuspendedPage />} />
              <Route path="/student" element={<Shell allow={['student']}><StudentDashboard /></Shell>} />
              <Route path="/supervisor" element={<Shell allow={['supervisor']}><SupervisorDashboard /></Shell>} />
              <Route path="/manager" element={<Shell allow={['manager']}><ManagerDashboard /></Shell>} />
              <Route path="/dashboard" element={<RoleRedirect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
