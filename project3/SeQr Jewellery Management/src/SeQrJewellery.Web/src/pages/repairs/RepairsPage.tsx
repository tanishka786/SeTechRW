import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Eye, Edit } from 'lucide-react'
import { repairsApi } from '../../api'
import { fmtCurrency, fmtDate, repairStatusLabel, repairStatusColor } from '../../utils/format'
import { RepairStatus } from '../../types'
import type { Repair } from '../../types'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import RepairForm from './components/RepairForm'
import RepairDetail from './components/RepairDetail'
import toast from 'react-hot-toast'

export default function RepairsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<RepairStatus | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [viewRepair, setViewRepair] = useState<Repair | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['repairs', statusFilter, search],
    queryFn: () => repairsApi.list(statusFilter, search),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RepairStatus }) => repairsApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['repairs'] }) },
  })

  const columns = [
    { key: 'repairOrderNumber', header: 'Order #', render: (r: Repair) => <span className="font-mono text-sm font-medium">{r.repairOrderNumber}</span> },
    { key: 'customer', header: 'Customer', render: (r: Repair) => <span>{r.customer?.fullName ?? '—'}</span> },
    { key: 'item', header: 'Item', render: (r: Repair) => (
      <div>
        <p className="text-sm font-medium text-gray-900 max-w-48 truncate">{r.itemDescription}</p>
        {r.metalType && <p className="text-xs text-gray-400">{r.metalType} {r.purity}</p>}
      </div>
    )},
    { key: 'receivedDate', header: 'Received', render: (r: Repair) => fmtDate(r.receivedDate) },
    { key: 'dueDate', header: 'Due', render: (r: Repair) => <span className={!r.estimatedCompletionDate ? 'text-gray-400' : ''}>{fmtDate(r.estimatedCompletionDate)}</span> },
    { key: 'cost', header: 'Est. Cost', render: (r: Repair) => fmtCurrency(r.estimatedCost) },
    { key: 'status', header: 'Status', render: (r: Repair) => (
      <select
        value={r.status}
        onChange={e => updateStatus.mutate({ id: r.id, status: Number(e.target.value) })}
        onClick={e => e.stopPropagation()}
        className={`text-xs font-medium rounded-full px-2 py-1 border-0 focus:ring-1 focus:ring-amber-500 cursor-pointer ${repairStatusColor[r.status]}`}
      >
        {Object.entries(repairStatusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    )},
    { key: 'actions', header: '', render: (r: Repair) => (
      <button onClick={e => { e.stopPropagation(); setViewRepair(r) }} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Eye size={15} /></button>
    )},
  ]

  const statusTabs: { label: string; value: RepairStatus | undefined }[] = [
    { label: 'All', value: undefined },
    { label: 'Received', value: RepairStatus.Received },
    { label: 'In Progress', value: RepairStatus.InProgress },
    { label: 'Ready', value: RepairStatus.ReadyForPickup },
    { label: 'Delivered', value: RepairStatus.Delivered },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Repairs</h1>
          <p className="text-sm text-gray-500">{data?.length ?? 0} repair orders</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={15} /> New Repair</Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setStatusFilter(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === value ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <Table data={data ?? []} columns={columns} loading={isLoading} onRowClick={setViewRepair} emptyMessage="No repair orders found" />
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Repair Order" size="xl">
        <RepairForm onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['repairs'] }); toast.success('Repair order created') }} />
      </Modal>

      <Modal open={!!viewRepair} onClose={() => setViewRepair(null)} title={`Repair ${viewRepair?.repairOrderNumber ?? ''}`} size="lg">
        {viewRepair && <RepairDetail repair={viewRepair} />}
      </Modal>
    </div>
  )
}
