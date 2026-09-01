import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Boxes, Forklift, Gauge, Package, QrCode, Users, Warehouse } from 'lucide-react';
import { KpiGrid } from '../components/dashboard/KpiGrid';
import { ChartCard } from '../components/ui/ChartCard';
import { ErrorState } from '../components/ui/LoadingState';
import { useWarehouse, useWarehouseStats } from '../context/WarehouseContext';
import { formatNumber, greetingForHour, relativeUpdated } from '../utils/formatters';

const COLORS = ['#F68529', '#991010', '#F5D34F', '#D51D25'];

export function Dashboard() {
  const warehouse = useWarehouse();
  const stats = useWarehouseStats();

  const categoryData = warehouse.categories.map((cat) => ({
    name: cat.name,
    value: warehouse.products.filter((p) => p.categoryId === cat.id).reduce((sum, p) => sum + p.quantity, 0),
  }));
  if (categoryData.every((d) => d.value === 0)) {
    categoryData.push({ name: 'Other', value: 1 });
  } else {
    categoryData.push({ name: 'Other', value: Math.max(40, Math.round(stats.totalQuantity * 0.08)) });
  }

  const binData = warehouse.bins.map((bin) => ({ name: bin.name, capacity: bin.capacity }));
  const forkliftData = warehouse.forklifts.map((f) => ({
    name: f.name,
    trips: f.status === 'Active' ? 18 : f.status === 'Idle' ? 7 : 2,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-maroon">{greetingForHour()}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Warehouse Overview</h2>
        <p className="text-sm text-slate-500">Last updated: {relativeUpdated(warehouse.lastUpdated)}</p>
      </div>
      {warehouse.error ? <ErrorState title="Database unavailable" message={warehouse.error} /> : null}

      <KpiGrid
        items={[
          { title: 'Total Products', value: formatNumber(stats.totalProducts), change: '+12.4%', icon: Package },
          { title: 'Total Bins', value: formatNumber(stats.binCount), icon: Warehouse },
          { title: 'Active Forklifts', value: formatNumber(stats.activeForklifts), icon: Forklift },
          { title: 'Active Users', value: formatNumber(stats.activeUsers), icon: Users },
          { title: 'Inventory Quantity', value: formatNumber(stats.totalQuantity), icon: Boxes },
          { title: 'Warehouse Utilization', value: `${stats.utilization}%`, icon: Gauge },
          { title: 'Scans today', value: formatNumber(stats.scansToday), icon: QrCode },
          { title: 'Unmatched scans today', value: formatNumber(stats.unmatchedToday), icon: QrCode },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Inventory overview" subtitle="Quantity over the last cycle">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={warehouse.inventoryHistory}>
              <defs>
                <linearGradient id="inv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F68529" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#F68529" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="quantity" stroke="#F68529" fill="url(#inv)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Product category distribution">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[categoryData.indexOf(entry) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Bin utilization">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={binData} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Bar dataKey="capacity" fill="#991010" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Forklift activity">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={forkliftData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="trips" fill="#F68529" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Daily inventory movement" subtitle="Inbound vs outbound">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={warehouse.inventoryHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="inbound" stroke="#E7C845" fill="#E7C84533" />
            <Area type="monotone" dataKey="outbound" stroke="#D51D25" fill="#D51D2522" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
