import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  Forklift,
  History,
  LayoutDashboard,
  LogOut,
  Radio,
  ScanLine,
  UserRound,
  Users,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { BrandMark } from './BrandMark';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bins', label: 'Bins', icon: Warehouse },
  { to: '/forklifts', label: 'Forklifts', icon: Forklift },
  { to: '/uwb', label: 'UWB Mapping', icon: Radio },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/scanner', label: 'Barcode / QR', icon: ScanLine },
  { to: '/scan-history', label: 'Scan History', icon: History },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'relative z-40 shrink-0 self-stretch bg-black text-slate-200 transition-[width] duration-300 ease-out',
        open ? 'w-72 overflow-visible' : 'w-0 overflow-hidden',
      )}
    >
      <div className="sticky top-0 flex h-dvh w-72 flex-col overflow-y-auto border-r border-white/5">
        <div className="flex items-center gap-3 px-5 py-5">
          <Link to="/" className="min-w-0" aria-label="Go to dashboard">
            <BrandMark size={36} />
            <p className="mt-2 text-sm font-semibold tracking-tight text-white">Birla Carbon</p>
          </Link>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon size={18} className={active ? 'text-brand-orange' : ''} />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <UserRound size={18} />
            User Profile
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Collapse navigation"
          onClick={onClose}
          className="absolute top-1/2 right-2 z-50 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white text-slate-800 shadow-md touch-manipulation"
        >
          <ChevronRight size={16} />
        </button>
      ) : null}
    </aside>
  );
}
