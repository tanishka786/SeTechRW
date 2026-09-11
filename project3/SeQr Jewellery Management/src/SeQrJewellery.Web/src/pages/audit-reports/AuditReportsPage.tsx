import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, ClipboardCheck } from 'lucide-react'
import { inventoryAuditsApi } from '../../api'
import {
  fmtDateTime,
  inventoryAuditStatusLabel,
  inventoryAuditStatusColor,
} from '../../utils/format'
import { InventoryAuditStatus } from '../../types'
import type { InventoryAuditListItem } from '../../types'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import AuditReportDetail from './components/AuditReportDetail'

export default function AuditReportsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [viewId, setViewId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-audits', statusFilter, page],
    queryFn: () =>
      inventoryAuditsApi.list({
        status: statusFilter ? (Number(statusFilter) as InventoryAuditStatus) : undefined,
        pageNumber: page,
        pageSize: 20,
      }),
    placeholderData: p => p,
  })

  const columns = [
    {
      key: 'startedAt',
      header: 'Started',
      render: (r: InventoryAuditListItem) => (
        <span className="text-sm font-medium text-gray-900">{fmtDateTime(r.startedAt)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: InventoryAuditListItem) => (
        <Badge label={inventoryAuditStatusLabel[r.status]} colorClass={inventoryAuditStatusColor[r.status]} />
      ),
    },
    {
      key: 'startedBy',
      header: 'Started by',
      render: (r: InventoryAuditListItem) => <span className="text-sm text-gray-700">{r.startedBy || '—'}</span>,
    },
    {
      key: 'expected',
      header: 'Expected',
      render: (r: InventoryAuditListItem) => <span className="tabular-nums">{r.expectedCount}</span>,
    },
    {
      key: 'matched',
      header: 'Matched',
      render: (r: InventoryAuditListItem) => (
        <span className="tabular-nums text-green-700 font-medium">{r.matchedCount}</span>
      ),
    },
    {
      key: 'missing',
      header: 'Missing',
      render: (r: InventoryAuditListItem) => (
        <span className={`tabular-nums font-medium ${r.missingCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
          {r.missingCount}
        </span>
      ),
    },
    {
      key: 'extra',
      header: 'Extra',
      render: (r: InventoryAuditListItem) => <span className="tabular-nums text-blue-700">{r.extraCount}</span>,
    },
    {
      key: 'sold',
      header: 'Sold',
      render: (r: InventoryAuditListItem) => <span className="tabular-nums text-purple-700">{r.soldSkippedCount}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (r: InventoryAuditListItem) => (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            setViewId(r.id)
          }}
          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"
          title="View report"
        >
          <Eye size={15} />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardCheck size={22} className="text-amber-600" />
            Audit Reports
          </h1>
          <p className="text-sm text-gray-500">
            Floor inventory audits from the Scan app · {data?.totalCount ?? 0} total
          </p>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(inventoryAuditStatusLabel).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <Table
          data={data?.items ?? []}
          columns={columns}
          loading={isLoading}
          onRowClick={r => setViewId(r.id)}
          emptyMessage="No inventory audits yet. Complete a floor check from the Scan app to see reports here."
        />
        <Pagination
          currentPage={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
          totalCount={data?.totalCount}
          pageSize={20}
        />
      </div>

      <Modal
        open={!!viewId}
        onClose={() => setViewId(null)}
        title="Inventory Audit Report"
        size="2xl"
      >
        {viewId && <AuditReportDetail auditId={viewId} />}
      </Modal>
    </div>
  )
}
