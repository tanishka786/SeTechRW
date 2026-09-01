import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  Forklift,
  LayoutDashboard,
  LogOut,
  Package,
  Radio,
  ScanLine,
  Settings,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { BrandMark, BrandWordmark } from './BrandMark';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/bins', label: 'Bins', icon: Warehouse },
  { to: '/forklifts', label: 'Forklifts', icon: Forklift },
  { to: '/uwb', label: 'UWB Mapping', icon: Radio },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/scanner', label: 'Barcode / QR', icon: ScanLine },
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
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/5 bg-black text-slate-200 transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <BrandWordmark inverted />
          </div>
          <Button variant="ghost" size="sm" className="text-slate-300 lg:hidden" aria-label="Close sidebar" onClick={onClose} icon={<X size={16} />} />
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
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

        <div className="space-y-1 border-t border-white/10 p-3">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Settings size={18} />
            Settings
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
      </aside>
    </>
  );
}
