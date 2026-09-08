import type { LucideIcon } from 'lucide-react';
import { DashboardCard } from '../ui/DashboardCard';

export function KpiGrid({
  items,
}: {
  items: Array<{ title: string; value: string; change?: string; icon: LucideIcon; to: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {items.map((item) => (
        <DashboardCard key={item.title} {...item} />
      ))}
    </div>
  );
}
