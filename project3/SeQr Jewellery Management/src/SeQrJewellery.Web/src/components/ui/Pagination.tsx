import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalCount?: number
  pageSize?: number
}

export default function Pagination({ currentPage, totalPages, onPageChange, totalCount, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null
  const start = totalCount ? (currentPage - 1) * (pageSize ?? 20) + 1 : undefined
  const end = totalCount ? Math.min(currentPage * (pageSize ?? 20), totalCount) : undefined

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t">
      {totalCount != null && <p className="text-sm text-gray-500">Showing {start}–{end} of {totalCount}</p>}
      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-600"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const page = i + 1
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === currentPage ? 'bg-amber-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              {page}
            </button>
          )
        })}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-600"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
