import { NavLink, useNavigate } from 'react-router-dom';
import { type LucideIcon, LogOut, Moon, Sun, BookOpen, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Brand } from '@/components/Brand';
import { useState, type ReactNode } from 'react';

interface NavItem { to: string; label: string; icon: LucideIcon }

const studentNav: NavItem[] = [
  { to: '/student', label: 'لوحتي', icon: BookOpen },
];

const supervisorNav: NavItem[] = [
  { to: '/supervisor', label: 'لوحة الإشراف', icon: BookOpen },
];

const managerNav: NavItem[] = [
  { to: '/manager', label: 'نظرة عامة', icon: BookOpen },
];

function navForRole(role?: string): NavItem[] {
  if (role === 'manager') return managerNav;
  if (role === 'supervisor') return supervisorNav;
  return studentNav;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navForRole(profile?.role);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-primary-50/30 dark:bg-primary-900/20">
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-primary-900/90 backdrop-blur border-b border-primary-100/60 dark:border-primary-800/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden rounded-lg p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-800/50"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="القائمة"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Brand />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-800/50 dark:text-primary-300"
              aria-label="تبديل الوضع الليلي"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 ps-2 border-s border-primary-100 dark:border-primary-800">
              <div className="text-left">
                <p className="text-sm font-medium text-primary-800 dark:text-primary-100 leading-tight">{profile?.full_name}</p>
                <p className="text-[11px] text-primary-500 dark:text-primary-400 leading-tight">{roleLabel(profile?.role)}</p>
              </div>
            </div>
            <button onClick={handleSignOut} className="rounded-lg p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-800/50 dark:text-primary-300" aria-label="خروج">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className={`${mobileOpen ? 'block' : 'hidden'} lg:block fixed lg:sticky top-16 lg:top-24 inset-0 lg:inset-auto z-20 lg:z-auto bg-white dark:bg-primary-900 lg:bg-transparent lg:dark:bg-transparent overflow-y-auto lg:overflow-visible`}>
          <nav className="flex flex-col gap-1 p-4 lg:p-0 lg:w-56">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-soft'
                      : 'text-primary-700 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-800/50'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}

function roleLabel(role?: string) {
  if (role === 'manager') return 'مدير';
  if (role === 'supervisor') return 'مشرف';
  return 'طالب';
}
