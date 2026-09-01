import type { LucideIcon } from 'lucide-react';
import { DashboardCard } from '../ui/DashboardCard';

export function KpiGrid({
  items,
}: {
  items: Array<{ title: string; value: string; change?: string; icon: LucideIcon }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {items.map((item) => (
        <DashboardCard key={item.title} {...item} />
      ))}
    </div>
  );
}
