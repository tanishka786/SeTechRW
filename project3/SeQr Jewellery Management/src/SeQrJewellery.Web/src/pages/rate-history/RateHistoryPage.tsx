import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Minus, Download } from 'lucide-react'
import { catalogApi, reportsApi } from '../../api'
import { fmtDateTime } from '../../utils/format'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import Button from '../../components/ui/Button'
import type { RateHistoryItem } from '../../types'
import toast from 'react-hot-toast'

export default function RateHistoryPage() {
  const [metalId, setMetalId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const { data: metals } = useQuery({ queryKey: ['metals'], queryFn: catalogApi.metals })

  const { data, isLoading } = useQuery({
    queryKey: ['rate-history', metalId, fromDate, toDate, page],
    queryFn: () => catalogApi.metalRateHistory({
      metalId: metalId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      pageNumber: page, pageSize: 25,
    }),
    placeholderData: p => p,
  })

  const handleExport = async () => {
    setExporting(true)
    try { await reportsApi.exportMetalRates(metalId || undefined, 3650); toast.success('Export downloaded') }
    catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const columns = [
    { key: 'rateDate', header: 'Date', render: (r: RateHistoryItem) => fmtDateTime(r.rateDate) },
    { key: 'metal', header: 'Metal', render: (r: RateHistoryItem) => <span className="font-medium">{r.metalName}</span> },
    { key: 'purity', header: 'Purity', render: (r: RateHistoryItem) => r.purityName },
    { key: 'ratePerGram', header: 'Rate/g', render: (r: RateHistoryItem) => <span className="font-semibold">₹{r.ratePerGram.toFixed(2)}</span> },
    { key: 'ratePerTola', header: 'Rate/Tola', render: (r: RateHistoryItem) => `₹${r.ratePerTola.toFixed(2)}` },
    {
      key: 'change', header: 'Change', render: (r: RateHistoryItem) => {
        if (r.changeAmount == null) return <span className="text-gray-400">—</span>
        const up = r.changeAmount > 0, flat = r.changeAmount === 0
        const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
        const color = flat ? 'text-gray-400' : up ? 'text-green-600' : 'text-red-600'
        return (
          <span className={`flex items-center gap-1 font-medium ${color}`}>
            <Icon size={13} />
            ₹{Math.abs(r.changeAmount).toFixed(2)} {r.changePercent != null && `(${r.changePercent.toFixed(2)}%)`}
          </span>
        )
      }
    },
    { key: 'itemsRepriced', header: 'Items Repriced', render: (r: RateHistoryItem) => r.itemsRepriced.toLocaleString() },
    { key: 'source', header: 'Source', render: (r: RateHistoryItem) => r.source ?? '—' },
    { key: 'updatedBy', header: 'Updated By', render: (r: RateHistoryItem) => r.updatedByUserName ?? '—' },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Metal Rate History</h1>
          <p className="text-sm text-gray-500">{data?.totalCount ?? 0} rate changes recorded</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting}><Download size={15} /> Export</Button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <select value={metalId} onChange={e => { setMetalId(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-32">
          <option value="">All Metals</option>
          {metals?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <label className="text-sm font-medium text-gray-700">From</label>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        <label className="text-sm font-medium text-gray-700">To</label>
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        {(metalId || fromDate || toDate) && (
          <button onClick={() => { setMetalId(''); setFromDate(''); setToDate(''); setPage(1) }} className="text-xs text-gray-500 hover:text-red-600 underline">
            Clear filters
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <Table data={data?.items ?? []} columns={columns} loading={isLoading} emptyMessage="No rate history recorded yet" />
        <Pagination currentPage={page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} totalCount={data?.totalCount} pageSize={25} />
      </div>
    </div>
  )
}
