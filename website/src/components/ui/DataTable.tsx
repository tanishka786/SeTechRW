import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

const PAGE_SIZE = 10;

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
  pageSize?: number;
  resetKey?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  rowClassName,
  pageSize = PAGE_SIZE,
  resetKey,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const pagedRows = rows.slice(start, start + pageSize);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  return (
    <div className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cn('whitespace-nowrap px-3 py-3 sm:px-4', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, index) => {
              const absoluteIndex = start + index;
              return (
                <tr
                  key={rowKey(row)}
                  className={cn('border-t border-slate-100 hover:bg-brand-yellow/15', rowClassName?.(row, absoluteIndex))}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('whitespace-nowrap px-3 py-3 text-slate-700 sm:px-4', col.className)}>
                      {col.render ? col.render(row, absoluteIndex) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <div className="p-8">{empty}</div> : (
        <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5 sm:px-4">
          <p className="mr-auto text-sm text-slate-500">
            {start + 1}–{Math.min(start + pageSize, rows.length)} of {rows.length}
          </p>
          <Button
            variant="outline"
            size="sm"
            aria-label="Previous page"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            icon={<ChevronLeft size={16} />}
          />
          <Button
            variant="outline"
            size="sm"
            aria-label="Next page"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
            icon={<ChevronRight size={16} />}
          />
        </div>
      )}
    </div>
  );
}
