import type { SelectHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
}

export function Select({ label, options, error, className, id, ...props }: SelectProps) {
  const selectId = id ?? props.name;
  return (
    <label className="block space-y-1.5" htmlFor={selectId}>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <select
        id={selectId}
        className={cn(
          'h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15',
          error ? 'border-rose-400' : 'border-slate-200',
          className,
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
