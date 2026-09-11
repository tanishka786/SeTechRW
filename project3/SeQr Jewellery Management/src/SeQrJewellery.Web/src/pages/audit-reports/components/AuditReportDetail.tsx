import { useQuery } from '@tanstack/react-query'
import { fmtDateTime, inventoryAuditOutcomeLabel, inventoryAuditOutcomeColor, inventoryAuditStatusLabel, inventoryAuditStatusColor } from '../../../utils/format'
import type { InventoryAuditReport } from '../../../types'
import { InventoryAuditStatus } from '../../../types'
import { inventoryAuditsApi } from '../../../api'
import Badge from '../../../components/ui/Badge'
import Spinner from '../../../components/ui/Spinner'

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
      <p className={`text-lg font-bold ${accent ?? 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

export default function AuditReportDetail({ auditId }: { auditId: string }) {
  const { data: audit, isLoading, error } = useQuery({
    queryKey: ['inventory-audit', auditId],
    queryFn: () => inventoryAuditsApi.getById(auditId),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (error || !audit) {
    return <p className="text-sm text-red-600 py-6 text-center">Failed to load audit report.</p>
  }

  return <AuditReportBody audit={audit} />
}

function AuditReportBody({ audit }: { audit: InventoryAuditReport }) {
  const inProgress = audit.status === InventoryAuditStatus.InProgress

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500">Started</p>
          <p className="font-semibold text-gray-900">{fmtDateTime(audit.startedAt)}</p>
          {audit.completedAt && (
            <p className="text-xs text-gray-500 mt-1">Completed {fmtDateTime(audit.completedAt)}</p>
          )}
          <div className="flex gap-2 mt-2">
            <Badge label={inventoryAuditStatusLabel[audit.status]} colorClass={inventoryAuditStatusColor[audit.status]} />
            <span className="text-xs text-gray-500 self-center">by {audit.startedBy || '—'}</span>
          </div>
        </div>
        {inProgress && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 max-w-xs">
            Audit still in progress. Counts finalize when the scan session is completed.
          </p>
        )}
      </div>

      {audit.notes && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-800">{audit.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Stat label="Expected" value={audit.expectedCount} />
        <Stat label="Scanned" value={audit.scannedCount} />
        <Stat label="Matched" value={audit.matchedCount} accent="text-green-700" />
        <Stat label="Missing" value={audit.missingCount} accent="text-red-600" />
        <Stat label="Extra" value={audit.extraCount} accent="text-blue-700" />
        <Stat label="Sold" value={audit.soldSkippedCount} accent="text-purple-700" />
      </div>

      <div>
        <p className="font-semibold text-gray-700 text-sm mb-2">Scans ({audit.scans?.length ?? 0})</p>
        {(audit.scans?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No scans recorded yet.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>
                  <th className="table-th">EPC Hex</th>
                  <th className="table-th">Item</th>
                  <th className="table-th">Outcome</th>
                  <th className="table-th">Scanned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {audit.scans.map(s => (
                  <tr key={s.id}>
                    <td className="table-td font-mono text-xs">{s.epcHex}</td>
                    <td className="table-td">
                      {s.sku ? (
                        <>
                          <p className="font-medium">{s.sku}</p>
                          {s.name && <p className="text-xs text-gray-500 truncate max-w-[180px]">{s.name}</p>}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="table-td">
                      <Badge label={inventoryAuditOutcomeLabel[s.outcome]} colorClass={inventoryAuditOutcomeColor[s.outcome]} />
                    </td>
                    <td className="table-td text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(s.scannedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <p className="font-semibold text-gray-700 text-sm mb-2">Missing ({audit.missing?.length ?? 0})</p>
        {(audit.missing?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            {audit.status === InventoryAuditStatus.Completed ? 'No missing tags.' : 'Missing items appear after completion.'}
          </p>
        ) : (
          <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>
                  <th className="table-th">Barcode</th>
                  <th className="table-th">EPC Hex</th>
                  <th className="table-th">Item</th>
                  <th className="table-th">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {audit.missing.map(m => (
                  <tr key={m.id}>
                    <td className="table-td font-mono text-xs">{m.barcodeValue ?? '—'}</td>
                    <td className="table-td font-mono text-xs">{m.epcHex ?? '—'}</td>
                    <td className="table-td">
                      {m.sku ? (
                        <>
                          <p className="font-medium">{m.sku}</p>
                          {m.name && <p className="text-xs text-gray-500">{m.name}</p>}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="table-td">
                      <Badge label={m.reason} colorClass="bg-red-50 text-red-700" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
