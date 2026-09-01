import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export function DashboardCard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
}) {
  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-brand-gold hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-brand-yellow">
          <Icon size={18} />
        </span>
        <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-brand-orange" />
      </div>
      <p className="mt-4 text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {change ? (
        <p className={cn('mt-2 text-xs font-medium', change.startsWith('-') ? 'text-rose-600' : 'text-emerald-600')}>
          {change}
        </p>
      ) : null}
    </article>
  );
}
