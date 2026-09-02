import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  rowClassName?: (row: T, index: number) => string | undefined;
}

export function DataTable<T>({ columns, rows, rowKey, empty, rowClassName }: DataTableProps<T>) {
  return (
    <div className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cn('whitespace-nowrap px-4 py-3', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={rowKey(row)}
                className={cn('border-t border-slate-100 hover:bg-brand-yellow/15', rowClassName?.(row, index))}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('whitespace-nowrap px-4 py-3 text-slate-700', col.className)}>
                    {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <div className="p-8">{empty}</div> : null}
    </div>
  );
}
