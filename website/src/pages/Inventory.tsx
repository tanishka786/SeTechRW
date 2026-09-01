import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Boxes } from 'lucide-react';
import { Badge, statusVariant } from '../components/ui/Badge';
import { ChartCard } from '../components/ui/ChartCard';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { InventorySummary } from '../components/inventory/InventorySummary';
import { useWarehouse, useWarehouseStats } from '../context/WarehouseContext';
import type { ProductStatus } from '../types';
import { relativeUpdated } from '../utils/formatters';

const statuses: Array<ProductStatus | 'All'> = ['All', 'In Stock', 'Low Stock', 'Out of Stock', 'Reserved'];

export function Inventory() {
  const warehouse = useWarehouse();
  const stats = useWarehouseStats();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [binId, setBinId] = useState('all');
  const [status, setStatus] = useState<ProductStatus | 'All'>('All');

  const filtered = useMemo(
    () =>
      warehouse.products.filter((p) => {
        const cat = warehouse.categories.find((c) => c.id === p.categoryId)?.name ?? '';
        const matchesQuery = `${p.id} ${p.name} ${cat}`.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = categoryId === 'all' || p.categoryId === categoryId;
        const matchesBin = binId === 'all' || p.binId === binId;
        const matchesStatus = status === 'All' || p.status === status;
        return matchesQuery && matchesCategory && matchesBin && matchesStatus;
      }),
    [binId, categoryId, query, status, warehouse.categories, warehouse.products],
  );

  return (
    <div className="space-y-6">
      <InventorySummary
        total={stats.totalQuantity}
        available={stats.available}
        reserved={stats.reserved}
        lowStock={stats.lowStock}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Search inventory" className="lg:col-span-1" />
        <Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={[
            { value: 'all', label: 'All categories' },
            ...warehouse.categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Select
          value={binId}
          onChange={(e) => setBinId(e.target.value)}
          options={[
            { value: 'all', label: 'All bins' },
            ...warehouse.bins.map((b) => ({ value: b.id, label: b.name })),
          ]}
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as ProductStatus | 'All')}
          options={statuses.map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))}
        />
      </div>

      <DataTable
        rows={filtered}
        rowKey={(row) => row.id}
        empty={<EmptyState icon={<Boxes />} title="No inventory rows" description="Try a different combination of filters." />}
        columns={[
          { key: 'name', header: 'Product', render: (row) => `${row.name}` },
          {
            key: 'category',
            header: 'Category',
            render: (row) => warehouse.categories.find((c) => c.id === row.categoryId)?.name ?? '—',
          },
          { key: 'quantity', header: 'Quantity' },
          { key: 'binId', header: 'Bin' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
          },
          { key: 'lastUpdated', header: 'Last Updated', render: (row) => relativeUpdated(row.lastUpdated) },
        ]}
      />

      <ChartCard title="Inventory movement" subtitle="Quantity trend">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={warehouse.inventoryHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="quantity" stroke="#F68529" fill="#F6852922" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
