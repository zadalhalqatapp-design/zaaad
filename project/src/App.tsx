import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { ToastProvider } from '@/components/ui/Toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingScreen } from '@/components/LoadingScreen';

const AuthPage = lazy(() => import('@/pages/auth/AuthPage').then((m) => ({ default: m.AuthPage })));

// Student pages
const StudentDashboard = lazy(() => import('@/pages/student/StudentDashboard').then((m) => ({ default: m.StudentDashboard })));
const HadithsPage = lazy(() => import('@/pages/student/HadithsPage').then((m) => ({ default: m.HadithsPage })));
const DailyLessonsPage = lazy(() => import('@/pages/student/DailyLessonsPage').then((m) => ({ default: m.DailyLessonsPage })));
const ProgressPage = lazy(() => import('@/pages/student/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const StudentCertificates = lazy(() => import('@/pages/student/CertificatesPage').then((m) => ({ default: m.StudentCertificates })));

// Shared pages
const MessagesPage = lazy(() => import('@/pages/shared/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const NotificationsPage = lazy(() => import('@/pages/shared/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const ProfilePage = lazy(() => import('@/pages/shared/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const ManagementDashboard = lazy(() => import('@/pages/shared/ManagementDashboard').then((m) => ({ default: m.ManagementDashboard })));
const StudentsManagementPage = lazy(() => import('@/pages/shared/StudentsManagementPage').then((m) => ({ default: m.StudentsManagementPage })));
const ApprovalsPage = lazy(() => import('@/pages/shared/ApprovalsPage').then((m) => ({ default: m.ApprovalsPage })));
const StudentProgressPage = lazy(() => import('@/pages/shared/StudentProgressPage').then((m) => ({ default: m.StudentProgressPage })));
const IssueCertificatesPage = lazy(() => import('@/pages/shared/IssueCertificatesPage').then((m) => ({ default: m.IssueCertificatesPage })));

// Admin pages
const StaffManagementPage = lazy(() => import('@/pages/admin/StaffManagementPage').then((m) => ({ default: m.StaffManagementPage })));
const HadithsManagementPage = lazy(() => import('@/pages/admin/HadithsManagementPage').then((m) => ({ default: m.HadithsManagementPage })));
const CyclesPage = lazy(() => import('@/pages/admin/CyclesPage').then((m) => ({ default: m.CyclesPage })));
const SettingsPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.SettingsPage })));
const OperationLogPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.OperationLogPage })));
const BackupsPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.BackupsPage })));
const FilesPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.FilesPage })));

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  const home = user.role === 'admin' ? '/admin' : user.role === 'supervisor' ? '/supervisor' : '/student';
  return <Navigate to={home} replace />;
}

function StudentApp() {
  return (
    <DashboardLayout basePath="/student">
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="daily" element={<DailyLessonsPage />} />
          <Route path="hadiths" element={<HadithsPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="certificates" element={<StudentCertificates />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}

function SupervisorApp() {
  return (
    <DashboardLayout basePath="/supervisor">
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="dashboard" element={<ManagementDashboard />} />
          <Route path="students" element={<StudentsManagementPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="student-progress" element={<StudentProgressPage />} />
          <Route path="issue-certificates" element={<IssueCertificatesPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage canSend />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}

function AdminApp() {
  return (
    <DashboardLayout basePath="/admin">
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="dashboard" element={<ManagementDashboard />} />
          <Route path="students" element={<StudentsManagementPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="student-progress" element={<StudentProgressPage />} />
          <Route path="issue-certificates" element={<IssueCertificatesPage />} />
          <Route path="supervisors" element={<StaffManagementPage role="supervisor" />} />
          <Route path="admins" element={<StaffManagementPage role="admin" />} />
          <Route path="manage-hadiths" element={<HadithsManagementPage />} />
          <Route path="cycles" element={<CyclesPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="logs" element={<OperationLogPage />} />
          <Route path="backups" element={<BackupsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage canSend />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
              <Route path="/" element={<RootRedirect />} />
              <Route path="/student/*" element={<ProtectedRoute roles={['student']}><StudentApp /></ProtectedRoute>} />
              <Route path="/supervisor/*" element={<ProtectedRoute roles={['supervisor']}><SupervisorApp /></ProtectedRoute>} />
              <Route path="/admin/*" element={<ProtectedRoute roles={['admin']}><AdminApp /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
