import { useQuery } from '@tanstack/react-query'
import { customersApi } from '../../../api'
import { fmtCurrency, fmtDate, invoiceStatusLabel, invoiceStatusColor } from '../../../utils/format'
import type { Customer } from '../../../types'
import Badge from '../../../components/ui/Badge'
import Spinner from '../../../components/ui/Spinner'

export default function CustomerDetail({ customer }: { customer: Customer }) {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['customer-invoices', customer.id],
    queryFn: () => customersApi.invoices(customer.id),
  })

  const details = [
    ['Phone', customer.phone ?? '—'], ['Alt. Phone', customer.alternatePhone ?? '—'],
    ['Email', customer.email ?? '—'], ['DOB', fmtDate(customer.dateOfBirth)],
    ['Anniversary', fmtDate(customer.anniversary)], ['PAN', customer.pan ?? '—'],
    ['GST', customer.gst ?? '—'], ['Credit Limit', fmtCurrency(customer.creditLimit)],
    ['Address', [customer.address, customer.city, customer.state, customer.country].filter(Boolean).join(', ') || '—'],
  ]

  return (
    <div className="space-y-5">
      {/* Customer Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{fmtCurrency(customer.totalPurchaseAmount)}</p>
          <p className="text-xs text-gray-500">Total Purchases</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{customer.totalPurchaseCount}</p>
          <p className="text-xs text-gray-500">Orders</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{customer.loyaltyPoints.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Loyalty Points</p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {details.map(([l, v]) => (
          <div key={l} className="flex justify-between py-1.5 border-b border-gray-100 text-sm">
            <span className="text-gray-500">{l}</span>
            <span className="font-medium text-gray-800 text-right max-w-[60%]">{v}</span>
          </div>
        ))}
      </div>

      {/* Purchase History */}
      <div>
        <p className="font-semibold text-sm text-gray-700 mb-2">Purchase History</p>
        {isLoading ? <div className="flex justify-center py-4"><Spinner /></div> : invoices?.length ? (
          <div className="space-y-2">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium font-mono">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-400">{fmtDate(inv.invoiceDate)} · {inv.items?.length ?? 0} items</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={invoiceStatusLabel[inv.status]} colorClass={invoiceStatusColor[inv.status]} />
                  <span className="text-sm font-bold text-gray-800">{fmtCurrency(inv.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400">No purchases yet</p>}
      </div>
    </div>
  )
}
