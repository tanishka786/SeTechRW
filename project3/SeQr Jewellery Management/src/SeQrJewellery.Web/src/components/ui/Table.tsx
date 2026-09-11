import { type ReactNode } from 'react'
import { cn } from '../../utils/format'
import Spinner from './Spinner'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export default function Table<T extends { id?: string }>({ data, columns, loading, onRowClick, emptyMessage = 'No data found' }: TableProps<T>) {
  if (loading) return (
    <div className="flex justify-center items-center py-16">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            {columns.map(col => (
              <th key={col.key} className={cn('table-th text-left', col.className)}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="py-12 text-center text-gray-500">{emptyMessage}</td></tr>
          ) : data.map((row, idx) => (
            <tr
              key={(row as Record<string, string>).id || idx}
              onClick={() => onRowClick?.(row)}
              className={cn('hover:bg-gray-50 transition-colors', onRowClick && 'cursor-pointer')}
            >
              {columns.map(col => (
                <td key={col.key} className={cn('table-td', col.className)}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
