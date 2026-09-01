import { StatCard } from '../ui/StatCard';
import { formatNumber } from '../../utils/formatters';

export function InventorySummary({
  total,
  available,
  reserved,
  lowStock,
}: {
  total: number;
  available: number;
  reserved: number;
  lowStock: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Inventory" value={formatNumber(total)} hint="units on hand" />
      <StatCard label="Available" value={formatNumber(available)} hint="in-stock SKUs" />
      <StatCard label="Reserved" value={formatNumber(reserved)} hint="allocated lines" />
      <StatCard label="Low Stock" value={formatNumber(lowStock)} hint="needs replenishment" />
    </div>
  );
}
