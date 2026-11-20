import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronDown,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, type UserRole } from '../types';

interface NavSubItem {
  label: string;
  to: string;
  roles: UserRole[];
}

interface NavItem {
  id: string;
  label: string;
  to?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  children?: NavSubItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/app',
    icon: LayoutDashboard,
    roles: ['admin', 'guru', 'tenaga_kependidikan'],
  },
  {
    id: 'absensi-karyawan',
    label: 'Absensi Karyawan',
    to: '/app/absensi-karyawan',
    icon: UserCheck,
    roles: ['admin', 'guru', 'tenaga_kependidikan'],
  },
  {
    id: 'absensi-siswa',
    label: 'Absensi Siswa',
    to: '/app/absensi-siswa',
    icon: ClipboardCheck,
    roles: ['admin', 'guru'],
  },
  {
    id: 'rekap-absensi',
    label: 'Rekap Absensi',
    icon: BarChart3,
    roles: ['admin', 'guru'],
    children: [
      {
        label: 'Absensi Karyawan',
        to: '/app/rekap/karyawan',
        roles: ['admin'],
      },
      {
        label: 'Absensi Siswa',
        to: '/app/rekap/siswa',
        roles: ['admin', 'guru'],
      },
    ],
  },
  {
    id: 'data-siswa',
    label: 'Data Siswa',
    to: '/app/data-siswa',
    icon: GraduationCap,
    roles: ['admin'],
  },
  {
    id: 'user-management',
    label: 'User Management',
    to: '/app/user-management',
    icon: Users,
    roles: ['admin'],
  },
];

function getBreadcrumbTitle(pathname: string): string {
  if (pathname === '/app' || pathname === '/app/') return 'Dashboard';
  if (pathname.startsWith('/app/absensi-karyawan')) return 'Absensi Karyawan';
  if (pathname.startsWith('/app/absensi-siswa')) return 'Absensi Siswa';
  if (pathname.startsWith('/app/rekap/karyawan')) return 'Rekap Absensi · Karyawan';
  if (pathname.startsWith('/app/rekap/siswa')) return 'Rekap Absensi · Siswa';
  if (pathname.startsWith('/app/data-siswa')) return 'Data Siswa';
  if (pathname.startsWith('/app/user-management')) return 'User Management';
  return 'Portal Aplikasi';
}

export default function AppLayout() {
  const { profile, user, loading, authError, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [rekapExpanded, setRekapExpanded] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-600">Memuat sesi aplikasi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-xl p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-red-700 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-zinc-900">Sesi Login Diperlukan</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Silakan masuk terlebih dahulu melalui halaman login untuk mengakses sistem absensi SMK Prima Unggul.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/"
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              Beranda
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors"
            >
              Masuk (/login)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentRole: UserRole = profile?.role || 'tenaga_kependidikan';
  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(currentRole));
  const breadcrumbTitle = getBreadcrumbTitle(location.pathname);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-zinc-200">
      {/* Brand Block */}
      <div className="h-16 px-5 border-b border-zinc-200 flex items-center justify-between shrink-0">
        <Link to="/app" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-700 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
            PU
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-zinc-900 tracking-tight truncate">
              SMK Prima Unggul
            </p>
            <p className="text-[11px] font-medium text-red-700 truncate">Portal Absensi</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-zinc-500 hover:text-zinc-900 rounded-md"
          aria-label="Tutup menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Menu Aplikasi" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          if (item.children) {
            const visibleChildren = item.children.filter((c) => c.roles.includes(currentRole));
            if (visibleChildren.length === 0) return null;
            const isChildActive = visibleChildren.some((c) => location.pathname.startsWith(c.to));

            return (
              <div key={item.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setRekapExpanded((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                    isChildActive
                      ? 'text-red-800 bg-red-50'
                      : 'text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isChildActive ? 'text-red-700' : 'text-zinc-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform ${
                      rekapExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {rekapExpanded && (
                  <div className="pl-7 space-y-1">
                    {visibleChildren.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `block px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap truncate ${
                            isActive
                              ? 'bg-red-700 text-white font-semibold'
                              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.id}
              to={item.to!}
              end={item.to === '/app'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-red-700 text-white font-semibold'
                    : 'text-zinc-700 font-medium hover:text-zinc-900 hover:bg-zinc-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Profile Summary in Sidebar */}
      <div className="p-4 border-t border-zinc-200 bg-zinc-50/70">
        <p className="text-xs font-semibold text-zinc-900 truncate">
          {profile?.full_name || user.email}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5 truncate">
          {ROLE_LABELS[currentRole]}
          {profile?.nip ? ` · ${profile.nip}` : ''}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-zinc-950/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-[260px] max-w-[80vw] h-full">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar with Logout Button at Top Right */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-zinc-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-zinc-400 whitespace-nowrap">Aplikasi</span>
              <span className="hidden sm:inline text-zinc-300" aria-hidden="true">
                /
              </span>
              <h1 className="font-bold text-zinc-900 truncate">{breadcrumbTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-900 max-w-[160px] truncate">
                {profile?.full_name || user.email}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-red-700">{ROLE_LABELS[currentRole]}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-700 hover:text-white border border-red-200 hover:border-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              {loggingOut ? 'Keluar...' : 'Logout'}
            </button>
          </div>
        </header>

        {/* Global Auth / DB warning if any */}
        {authError && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800">
            <strong className="font-semibold">Perhatian Database:</strong> {authError}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
