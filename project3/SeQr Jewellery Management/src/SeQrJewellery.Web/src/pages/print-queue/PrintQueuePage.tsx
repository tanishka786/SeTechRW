import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Printer, RefreshCw, XCircle, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react'
import { printQueueApi } from '../../api'
import { fmtDateTime, printStatusLabel, printStatusColor, tagTypeLabel } from '../../utils/format'
import { PrintStatus } from '../../types'
import type { PrintJob } from '../../types'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'

export default function PrintQueuePage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<PrintStatus | undefined>(undefined)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['print-queue', statusFilter],
    queryFn: () => printQueueApi.list(statusFilter),
    refetchInterval: 5000,
  })

  const cancelMutation = useMutation({
    mutationFn: printQueueApi.cancel,
    onSuccess: () => { toast.success('Job cancelled'); qc.invalidateQueries({ queryKey: ['print-queue'] }) },
  })

  const requeueMutation = useMutation({
    mutationFn: printQueueApi.requeue,
    onSuccess: () => { toast.success('Job requeued'); qc.invalidateQueries({ queryKey: ['print-queue'] }) },
  })

  const clearMutation = useMutation({
    mutationFn: () => printQueueApi.clearCompleted(new Date(Date.now() - 86400000).toISOString()),
    onSuccess: (r) => { toast.success(`Cleared ${(r as {clearedCount: number}).clearedCount} completed jobs`); qc.invalidateQueries({ queryKey: ['print-queue'] }) },
  })

  const columns = [
    { key: 'sku', header: 'Item', render: (r: PrintJob) => (
      <div>
        <p className="font-medium text-sm">{r.itemName ?? 'N/A'}</p>
        <p className="text-xs font-mono text-gray-400">{r.itemSKU}</p>
      </div>
    )},
    { key: 'tagValue', header: 'Tag', render: (r: PrintJob) => (
      <div>
        <p className="font-mono text-xs">{r.tagValue ?? '—'}</p>
        <p className="text-xs text-gray-400">{tagTypeLabel[r.tagType]}</p>
      </div>
    )},
    { key: 'labelTemplate', header: 'Template', render: (r: PrintJob) => r.labelTemplate },
    { key: 'copies', header: 'Copies', render: (r: PrintJob) => `${r.printedCopies}/${r.copies}` },
    { key: 'printerName', header: 'Printer', render: (r: PrintJob) => r.printerName ?? '—' },
    { key: 'priority', header: 'Priority', render: (r: PrintJob) => r.priority },
    { key: 'status', header: 'Status', render: (r: PrintJob) => <Badge label={printStatusLabel[r.status]} colorClass={printStatusColor[r.status]} /> },
    { key: 'createdAt', header: 'Queued', render: (r: PrintJob) => fmtDateTime(r.createdAt) },
    { key: 'actions', header: '', render: (r: PrintJob) => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        {r.status === PrintStatus.Pending && (
          <button onClick={() => cancelMutation.mutate(r.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Cancel"><XCircle size={15} /></button>
        )}
        {(r.status === PrintStatus.Failed || r.status === PrintStatus.Cancelled) && (
          <button onClick={() => requeueMutation.mutate(r.id)} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg" title="Requeue"><RotateCcw size={15} /></button>
        )}
      </div>
    )},
  ]

  const statusCounts = data ? {
    all: data.length,
    pending: data.filter(j => j.status === PrintStatus.Pending).length,
    printing: data.filter(j => j.status === PrintStatus.Printing).length,
    completed: data.filter(j => j.status === PrintStatus.Completed).length,
    failed: data.filter(j => j.status === PrintStatus.Failed).length,
  } : null

  const tabs = [
    { label: 'All', value: undefined }, { label: 'Pending', value: PrintStatus.Pending },
    { label: 'Printing', value: PrintStatus.Printing }, { label: 'Completed', value: PrintStatus.Completed },
    { label: 'Failed', value: PrintStatus.Failed },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Print Queue</h1>
          <p className="text-sm text-gray-500">Manage label print jobs · Auto-refreshes every 5s</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => clearMutation.mutate()} loading={clearMutation.isPending}>
            <Trash2 size={14} /> Clear Completed
          </Button>
          <Button variant="secondary" size="sm" onClick={() => refetch()}><RefreshCw size={14} /></Button>
        </div>
      </div>

      {/* Stats */}
      {statusCounts && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total', count: statusCounts.all, color: 'bg-gray-100 text-gray-700' },
            { label: 'Pending', count: statusCounts.pending, color: 'bg-yellow-100 text-yellow-700' },
            { label: 'Printing', count: statusCounts.printing, color: 'bg-blue-100 text-blue-700' },
            { label: 'Completed', count: statusCounts.completed, color: 'bg-green-100 text-green-700' },
            { label: 'Failed', count: statusCounts.failed, color: 'bg-red-100 text-red-700' },
          ].map(({ label, count, color }) => (
            <div key={label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${color.split(' ')[1]}`}>{count}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setStatusFilter(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === value ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <Table data={data ?? []} columns={columns} loading={isLoading} emptyMessage="No print jobs" />
      </div>

      <div className="card p-4 bg-blue-50 border-blue-200 text-sm text-blue-700">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} />
          <p><b>Bartender Integration:</b> The Bartender system polls <code className="bg-blue-100 px-1 rounded">/api/printqueue/pending</code> every few seconds to pick up new print jobs with their formatted template data.</p>
        </div>
      </div>
    </div>
  )
}
