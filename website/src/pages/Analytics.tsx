import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Pause, Play } from 'lucide-react';
import { ActivityFeed } from '../components/analytics/ActivityFeed';
import { Button } from '../components/ui/Button';
import { ChartCard } from '../components/ui/ChartCard';
import { StatCard } from '../components/ui/StatCard';
import { useWarehouse, useWarehouseStats } from '../context/WarehouseContext';
import { formatNumber, relativeUpdated } from '../utils/formatters';

const COLORS = ['#F68529', '#991010', '#F5D34F'];

export function Analytics() {
  const warehouse = useWarehouse();
  const stats = useWarehouseStats();

  const categoryData = [
    ...warehouse.categories.map((cat) => ({
      name: cat.name,
      value: warehouse.products.filter((p) => p.categoryId === cat.id).reduce((sum, p) => sum + p.quantity, 0),
    })),
    { name: 'Other', value: Math.max(80, Math.round(stats.totalQuantity * 0.06)) },
  ];

  const binData = warehouse.bins.map((bin) => ({ name: bin.name, capacity: bin.capacity }));
  const forkliftData = warehouse.forklifts.map((f, i) => ({
    name: f.name,
    trips: f.status === 'Active' ? 21 - i : f.status === 'Idle' ? 9 : 3,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Live Warehouse Analytics</h2>
          <p className="text-sm text-slate-500">Real-time operational intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold">
            <span className={`h-2 w-2 rounded-full bg-emerald-500 ${warehouse.livePaused ? '' : 'live-dot'}`} />
            {warehouse.livePaused ? 'Paused' : 'LIVE'}
          </div>
          <p className="text-xs text-slate-500">Last updated: {relativeUpdated(warehouse.lastUpdated)}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => warehouse.setLivePaused(!warehouse.livePaused)}
            icon={warehouse.livePaused ? <Play size={14} /> : <Pause size={14} />}
          >
            {warehouse.livePaused ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Warehouse Utilization" value={`${stats.utilization}%`} />
        <StatCard label="Active Forklifts" value={formatNumber(stats.activeForklifts)} />
        <StatCard label="Active Operators" value={formatNumber(stats.activeUsers)} />
        <StatCard label="Inventory" value={formatNumber(stats.totalQuantity)} />
        <StatCard label="Bins Occupied" value={`${stats.occupiedBins} / ${stats.binCount}`} />
        <StatCard label="Average Handling Time" value="4m 32s" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard title="Inventory Movement" subtitle="Time vs quantity">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={warehouse.inventoryHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="quantity" stroke="#F68529" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <ChartCard title="Product Categories">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={4}>
                {categoryData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Forklift Activity">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forkliftData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="trips" fill="#991010" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Bin Utilization">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={binData} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="capacity" fill="#F68529" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ChartCard title="Warehouse Activity" subtitle="Operational intensity">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={warehouse.inventoryHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="activity" stroke="#E7C845" fill="#E7C84522" />
                <Area type="monotone" dataKey="inbound" stroke="#F68529" fill="#F6852918" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm xl:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent Events</h3>
          <ActivityFeed events={warehouse.events.slice(0, 8)} />
        </section>
      </div>
    </div>
  );
}
