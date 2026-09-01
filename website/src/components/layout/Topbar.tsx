import { Menu, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWarehouse } from '../../context/WarehouseContext';
import { relativeUpdated } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { NotificationBell } from './NotificationBell';

export function Topbar({
  title,
  subtitle,
  onMenu,
}: {
  title: string;
  subtitle?: string;
  onMenu: () => void;
}) {
  const { currentUser } = useAuth();
  const { lastUpdated, refresh } = useWarehouse();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#faf6ee]/85 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="lg:hidden" aria-label="Open navigation" onClick={onMenu} icon={<Menu size={16} />} />
          <div>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h1>
            {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-slate-500 sm:block">Last updated: {relativeUpdated(lastUpdated)}</p>
          <Button
            variant="outline"
            size="sm"
            aria-label="Refresh warehouse data"
            onClick={() => void onRefresh()}
            icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
          <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:inline">
            LIVE
          </span>
          <NotificationBell />
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-sm font-semibold text-brand-yellow">
            {(currentUser?.name ?? 'A').slice(0, 1)}
          </div>
        </div>
      </div>
    </header>
  );
}
