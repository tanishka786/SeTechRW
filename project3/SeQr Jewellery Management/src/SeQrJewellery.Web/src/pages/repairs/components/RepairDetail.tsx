import { fmtCurrency, fmtDate, repairStatusLabel, repairStatusColor } from '../../../utils/format'
import type { Repair } from '../../../types'
import Badge from '../../../components/ui/Badge'

export default function RepairDetail({ repair }: { repair: Repair }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold font-mono">{repair.repairOrderNumber}</p>
          <p className="text-sm text-gray-500">{repair.customer?.fullName}</p>
        </div>
        <Badge label={repairStatusLabel[repair.status]} colorClass={repairStatusColor[repair.status]} />
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="font-semibold text-sm mb-2">Item Description</p>
        <p className="text-sm text-gray-700">{repair.itemDescription}</p>
        {repair.metalType && (
          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            <span>Metal: <b>{repair.metalType}</b></span>
            {repair.purity && <span>Purity: <b>{repair.purity}</b></span>}
            {repair.itemWeight && <span>Weight: <b>{repair.itemWeight}g</b></span>}
            {repair.condition && <span>Condition: <b>{repair.condition}</b></span>}
          </div>
        )}
      </div>

      {repair.customerInstructions && (
        <div className="bg-blue-50 rounded-lg p-3 text-sm">
          <p className="font-medium text-blue-700 mb-1">Customer Instructions</p>
          <p className="text-gray-700">{repair.customerInstructions}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[
          ['Received', fmtDate(repair.receivedDate)],
          ['Est. Completion', fmtDate(repair.estimatedCompletionDate)],
          ['Actual Completion', fmtDate(repair.actualCompletionDate)],
          ['Delivery Date', fmtDate(repair.deliveryDate)],
        ].map(([l, v]) => (
          <div key={l} className="text-sm">
            <p className="text-gray-500 text-xs">{l}</p>
            <p className="font-medium">{v}</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 rounded-xl p-4 space-y-2">
        {[
          ['Estimated Cost', fmtCurrency(repair.estimatedCost)],
          ['Actual Cost', fmtCurrency(repair.actualCost)],
          ['Advance Paid', fmtCurrency(repair.advanceAmount)],
          ['Balance', fmtCurrency(repair.balanceAmount)],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between text-sm">
            <span className="text-gray-600">{l}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>

      {repair.repairItems?.length > 0 && (
        <div>
          <p className="font-semibold text-sm mb-2">Tasks</p>
          <div className="space-y-2">
            {repair.repairItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={item.isCompleted} readOnly className="rounded text-amber-600" />
                  <span>{item.description}</span>
                </div>
                <span className="font-medium">{fmtCurrency(item.estimatedCost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
