import { Menu, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useWarehouse } from '../../context/WarehouseContext';
import { Button } from '../ui/Button';
import { NotificationBell } from './NotificationBell';

export function Topbar({
  title,
  showMenu,
  onMenu,
}: {
  title: string;
  showMenu: boolean;
  onMenu: () => void;
}) {
  const { currentUser } = useAuth();
  const { refresh } = useWarehouse();
  const { pushToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const ok = await refresh();
    setRefreshing(false);
    if (ok) pushToast('success', 'Warehouse data refreshed');
    else pushToast('error', 'Unable to refresh. Make sure the API is running.');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#faf6ee]/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="flex min-w-0 items-center justify-between gap-2 px-4 py-3 md:gap-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {showMenu ? (
            <Button variant="outline" size="sm" className="shrink-0" aria-label="Open navigation" onClick={onMenu} icon={<Menu size={16} />} />
          ) : null}
          <h1 className="truncate text-base font-semibold text-slate-900 sm:text-xl">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            aria-label="Refresh warehouse data"
            onClick={() => void onRefresh()}
            icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          <NotificationBell />
          <Link
            to="/settings"
            aria-label="Open user profile"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-sm font-semibold text-brand-yellow"
          >
            {(currentUser?.name ?? 'A').slice(0, 1)}
          </Link>
        </div>
      </div>
    </header>
  );
}
