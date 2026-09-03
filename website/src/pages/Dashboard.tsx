import { Forklift, Gauge, QrCode, Users, Warehouse } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KpiGrid } from '../components/dashboard/KpiGrid';
import { ErrorState } from '../components/ui/LoadingState';
import { useWarehouse, useWarehouseStats } from '../context/WarehouseContext';
import { formatNumber } from '../utils/formatters';

export function Dashboard() {
  const warehouse = useWarehouse();
  const stats = useWarehouseStats();

  return (
    <div className="space-y-6">
      {warehouse.error ? <ErrorState title="Database unavailable" message={warehouse.error} /> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link to="/" aria-label="Go to dashboard" className="shrink-0">
              <img
                src="/aditya-birla-logo-retina.png"
                alt="Aditya Birla Group"
                className="h-12 w-auto object-contain sm:h-16"
              />
            </Link>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-maroon">Aditya Birla Group</p>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Birla Carbon</h2>
              <p className="mt-1 text-sm text-slate-500">Warehouse Intelligence · Connected to a Greener Future</p>
            </div>
          </div>
          <a
            href="https://www.birlacarbon.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-brand-gold hover:text-brand-maroon"
          >
            Visit birlacarbon.com
          </a>
        </div>
      </section>

      <KpiGrid
        items={[
          { title: 'Total Bins', value: formatNumber(stats.binCount), icon: Warehouse, to: '/bins' },
          { title: 'Active Forklifts', value: formatNumber(stats.activeForklifts), icon: Forklift, to: '/forklifts' },
          { title: 'Active Users', value: formatNumber(stats.activeUsers), icon: Users, to: '/users' },
          { title: 'Warehouse Utilization', value: `${stats.utilization}%`, icon: Gauge, to: '/bins' },
          { title: 'Scans today', value: formatNumber(stats.scansToday), icon: QrCode, to: '/scanner' },
          { title: 'Unmatched scans today', value: formatNumber(stats.unmatchedToday), icon: QrCode, to: '/scan-history' },
        ]}
      />
    </div>
  );
}
