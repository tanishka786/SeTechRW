import type { BadgeVariant } from '../../types';
import { cn } from '../../utils/cn';

const styles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-brand-maroon ring-brand-red/30',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  info: 'bg-orange-50 text-brand-orange ring-brand-orange/30',
  accent: 'bg-brand-yellow/30 text-brand-maroon ring-brand-gold',
};

export function Badge({
  children,
  variant = 'neutral',
  className,
}: {
  children: string;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'Active':
    case 'In Stock':
    case 'Available':
      return 'success';
    case 'Idle':
    case 'Low Stock':
    case 'Occupied':
    case 'Logged Out':
      return 'warning';
    case 'Maintenance':
    case 'Reserved':
      return 'info';
    case 'Offline':
    case 'Out of Stock':
    case 'Full':
      return 'danger';
    default:
      return 'neutral';
  }
}
