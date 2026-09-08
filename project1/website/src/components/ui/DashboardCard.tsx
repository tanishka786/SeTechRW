import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

export function DashboardCard({
  title,
  value,
  change,
  icon: Icon,
  to,
}: {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-brand-gold hover:shadow-md sm:p-4"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-brand-yellow sm:h-10 sm:w-10">
          <Icon size={18} />
        </span>
        <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-brand-orange" />
      </div>
      <p className="mt-3 text-xs text-slate-500 sm:mt-4 sm:text-sm">{title}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">{value}</p>
      {change ? (
        <p className={cn('mt-2 text-xs font-medium', change.startsWith('-') ? 'text-rose-600' : 'text-emerald-600')}>
          {change}
        </p>
      ) : null}
    </Link>
  );
}
