import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { getNavForRole, ROLE_LABELS } from '@/config/nav';
import { APPS_CONFIG } from '@/config';
import { Button } from '@/components/ui/Button';

interface DashboardLayoutProps {
  children: ReactNode;
  basePath: string;
}

export function DashboardLayout({ children, basePath }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const navItems = getNavForRole(user.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-primary-900 text-white">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-primary-800">
        <img src={APPS_CONFIG.LOGO_URL} alt="شعار زاد الحلقات" className="w-10 h-10 rounded-xl object-cover bg-white shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-base truncate">{APPS_CONFIG.APP_NAME}</p>
          <p className="text-xs text-primary-200 truncate">{ROLE_LABELS[user.role]}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={`${basePath}/${item.path}`}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'text-primary-100 hover:bg-primary-800'
                }`
              }
            >
              <Icon size={20} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              <ChevronLeft size={16} className="opacity-50" />
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-primary-800">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <p className="text-xs text-primary-200 truncate">{user.email}</p>
        </div>
        <Button variant="text" size="sm" fullWidth onClick={handleLogout} className="text-primary-100 hover:bg-primary-800 justify-start" icon={<LogOut size={18} />}>
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-dim">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 right-0 w-64 hidden lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 animate-slide-up">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pr-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-outline-variant">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-surface-dim text-on-surface"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <img src={APPS_CONFIG.LOGO_URL} alt="شعار زاد الحلقات" className="w-8 h-8 rounded-lg object-cover bg-white" />
              <span className="font-bold text-sm">{APPS_CONFIG.APP_NAME}</span>
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-on-surface">{user.name}</p>
                <p className="text-xs text-on-surface-variant">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>

      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-surface shadow-md text-on-surface"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}
