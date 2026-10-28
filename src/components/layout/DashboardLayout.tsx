import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { getNavForRole, ROLE_LABELS, SECTION_LABELS, type NavSection } from '@/config/nav';
import { APPS_CONFIG } from '@/config';
import { Button } from '@/components/ui/Button';
import { useT } from '@/theme/store';

interface DashboardLayoutProps {
  children: ReactNode;
  basePath: string;
}

export function DashboardLayout({ children, basePath }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // القائمة المنزلقة: تُغلق عند التنقل وبمفتاح Escape، ويُقفل تمرير الصفحة خلفها
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  if (!user) return null;

  const navItems = getNavForRole(user.role);
  const appName = t(APPS_CONFIG.APP_NAME);
  // عنوان الصفحة الحالية في الشريط العلوي (كما في التطبيق)
  const current = navItems.find((n) => location.pathname.startsWith(`${basePath}/${n.path}`));
  const pageTitle = current ? t(current.label) : appName;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // تجميع عناصر القائمة في أقسام بعناوين صغيرة (يُحافظ على الترتيب الأصلي)
  const sections: { id: NavSection; items: typeof navItems }[] = [];
  for (const item of navItems) {
    const last = sections[sections.length - 1];
    if (last && last.id === item.section) last.items.push(item);
    else sections.push({ id: item.section, items: [item] });
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-primary-900 text-white">
      <div className="px-5 py-5 flex items-center gap-3 border-b border-primary-800">
        <img src={APPS_CONFIG.LOGO_URL} alt={appName} className="w-10 h-10 rounded-xl object-cover bg-white shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-base truncate">{appName}</p>
          <p className="text-xs text-primary-200 truncate">{t(ROLE_LABELS[user.role])}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="القائمة الرئيسية">
        {sections.map((section, idx) => (
          <Fragment key={`${section.id}-${idx}`}>
            {idx > 0 && (
              <p className="px-3 pb-1 pt-4 text-[11px] font-semibold tracking-wide text-primary-300/80">
                {SECTION_LABELS[section.id]}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={`${basePath}/${item.path}`}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-700 text-white shadow-sm ring-1 ring-secondary-400/40'
                          : 'text-primary-100 hover:bg-primary-800'
                      }`
                    }
                  >
                    <Icon size={20} className="shrink-0" />
                    <span className="flex-1">{t(item.label)}</span>
                    <ChevronLeft size={16} className="opacity-50" />
                  </NavLink>
                );
              })}
            </div>
          </Fragment>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-primary-800">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <p className="text-xs text-primary-200 truncate">{user.email}</p>
        </div>
        <Button variant="text" size="sm" fullWidth onClick={handleLogout} className="text-primary-100 hover:bg-primary-800 justify-start" icon={<LogOut size={18} />}>
          {t('تسجيل الخروج')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-dim">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 w-64 hidden lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="القائمة">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 max-w-[85vw] animate-slide-up">{sidebar}</aside>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق القائمة"
            className="absolute top-4 end-4 z-50 p-2 rounded-lg bg-surface shadow-md text-on-surface"
          >
            <X size={20} />
          </button>
        </div>
      )}

      <div className="lg:ps-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-primary-600 text-white shadow-md">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-lg p-2 hover:bg-white/10"
              aria-label="القائمة"
            >
              <Menu size={22} />
            </button>
            <h1 className="flex-1 truncate text-lg font-bold">{pageTitle}</h1>
            <div className="hidden items-center gap-3 lg:flex">
              <div className="text-start">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-primary-100">{t(ROLE_LABELS[user.role])}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
                {user.name.charAt(0)}
              </div>
            </div>
            <img src={APPS_CONFIG.LOGO_URL} alt={appName} className="h-8 w-8 rounded-lg bg-white object-cover lg:hidden" />
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
