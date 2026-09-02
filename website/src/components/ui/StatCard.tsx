import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  trend?: { value: string; positive?: boolean };
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-900/5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
        {icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-brand-yellow">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {trend ? (
          <span className={cn('font-semibold', trend.positive === false ? 'text-rose-600' : 'text-emerald-600')}>
            {trend.value}
          </span>
        ) : null}
        {hint ? <span className="text-slate-500">{hint}</span> : null}
      </div>
    </article>
  );
}
