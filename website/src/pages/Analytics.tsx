import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ActivityFeed } from '../components/analytics/ActivityFeed';
import { ChartCard } from '../components/ui/ChartCard';
import { StatCard } from '../components/ui/StatCard';
import { useWarehouse, useWarehouseStats } from '../context/WarehouseContext';
import type { TimeSeriesPoint } from '../types';
import { formatNumber } from '../utils/formatters';
import { formatBinId, formatMachineId } from '../utils/validation';

function ActivityTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-lg">
      <p className="font-semibold text-slate-900">{label}</p>
      <ul className="mt-2 space-y-1">
        {payload.map((item) => (
          <li key={item.name} className="flex items-center justify-between gap-6 text-slate-700">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="font-semibold tabular-nums">{item.value ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WarehouseActivityChart({ points }: { points: TimeSeriesPoint[] }) {
  const latest = points[points.length - 1];
  const busiest = points.reduce(
    (best, point) => {
      const total = point.inbound + point.outbound + point.activity;
      return total > best.total ? { time: point.time, total } : best;
    },
    { time: '—', total: 0 },
  );
  const data = points.map((point) => ({
    time: point.time,
    inbound: point.inbound,
    outbound: point.outbound,
    moves: point.activity,
  }));

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-semibold text-slate-900">Warehouse activity by time</h3>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
        Each time on the bottom is a live snapshot. Orange bars are inbound loads received, maroon bars are outbound
        loads dispatched, and the gold line is how many times machines moved between bins.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Latest inbound</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{latest ? `${latest.inbound} loads` : '—'}</p>
          <p className="text-xs text-slate-500">Goods received {latest ? `at ${latest.time}` : ''}</p>
        </article>
        <article className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Latest outbound</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{latest ? `${latest.outbound} loads` : '—'}</p>
          <p className="text-xs text-slate-500">Goods dispatched {latest ? `at ${latest.time}` : ''}</p>
        </article>
        <article className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Busiest snapshot</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{busiest.total} jobs</p>
          <p className="text-xs text-slate-500">{busiest.time === '—' ? 'No samples yet' : `Most work at ${busiest.time}`}</p>
        </article>
      </div>

      <div className="mt-4 h-72 w-full min-w-0 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={48} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<ActivityTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="inbound" name="Inbound loads" fill="#F68529" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="outbound" name="Outbound loads" fill="#991010" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Line type="monotone" dataKey="moves" name="Machine moves" stroke="#E7C845" strokeWidth={3} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 space-y-1 text-xs text-slate-500">
        <li>
          <span className="font-semibold text-brand-orange">Inbound loads</span> — number of loads brought into the warehouse.
        </li>
        <li>
          <span className="font-semibold text-brand-maroon">Outbound loads</span> — number of loads sent out of the warehouse.
        </li>
        <li>
          <span className="font-semibold text-brand-gold">Machine moves</span> — number of forklift trips between bins.
        </li>
      </ul>
    </section>
  );
}

export function Analytics() {
  const warehouse = useWarehouse();
  const stats = useWarehouseStats();

  const binData = warehouse.bins.map((bin) => ({ name: formatBinId(bin.id), capacity: bin.capacity }));
  const forkliftData = warehouse.forklifts.map((machine, index) => ({
    name: formatMachineId(machine.id),
    trips: machine.status === 'Active' ? 21 - index : machine.status === 'Idle' ? 9 : 3,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Warehouse Utilization" value={`${stats.utilization}%`} />
        <StatCard label="Active Forklifts" value={formatNumber(stats.activeForklifts)} />
        <StatCard label="Active Operators" value={formatNumber(stats.activeUsers)} />
        <StatCard label="Bins Occupied" value={`${stats.occupiedBins} / ${stats.binCount}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Forklift Activity" subtitle="Trips completed by each machine">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forkliftData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="trips" name="Trips" fill="#991010" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Bin Utilization" subtitle="How many kilograms are stored in each 100 kg bin">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={binData} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit=" kg" />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => [`${value} kg`, 'Stored']} />
              <Bar dataKey="capacity" name="Stored" fill="#F68529" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <WarehouseActivityChart points={warehouse.inventoryHistory} />
        </div>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent Events</h3>
          <ActivityFeed events={warehouse.events.slice(0, 8)} />
        </section>
      </div>
    </div>
  );
}
