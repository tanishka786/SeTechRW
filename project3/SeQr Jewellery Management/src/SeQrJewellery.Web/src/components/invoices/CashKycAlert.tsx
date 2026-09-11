import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { fmtCurrency } from '../../utils/format'

export const DEFAULT_CASH_PAN_LIMIT = 200_000

export function isValidPan(pan?: string | null) {
  return !!pan && /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan.trim())
}

interface Props {
  cashOnThisBill: number
  todayCashElsewhere?: number
  limit: number
  customerId?: string
  storedPan?: string | null
  capturedPan: string
  onPanChange: (pan: string) => void
}

export default function CashKycAlert({
  cashOnThisBill,
  todayCashElsewhere = 0,
  limit,
  customerId,
  storedPan,
  capturedPan,
  onPanChange,
}: Props) {
  const projected = cashOnThisBill + todayCashElsewhere
  if (projected < limit) return null

  const hasPan = isValidPan(storedPan) || isValidPan(capturedPan)
  const overBy = projected - limit

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${hasPan ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-start gap-2">
        {hasPan
          ? <ShieldCheck size={18} className="text-amber-700 mt-0.5 shrink-0" />
          : <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />}
        <div>
          <p className={`text-sm font-semibold ${hasPan ? 'text-amber-900' : 'text-red-800'}`}>
            Cash KYC limit crossed
          </p>
          <p className={`text-xs mt-1 ${hasPan ? 'text-amber-800' : 'text-red-700'}`}>
            Cash of {fmtCurrency(projected)} meets or exceeds {fmtCurrency(limit)}
            {todayCashElsewhere > 0 ? ` (including ${fmtCurrency(todayCashElsewhere)} already taken in cash from this customer today)` : ''}.
            Income Tax s.269ST does not allow receiving ₹{limit.toLocaleString('en-IN')} or more in cash — collect the extra {fmtCurrency(overBy)} by UPI, card, or bank.
            PAN is still required on this bill.
          </p>
        </div>
      </div>

      {!customerId && (
        <p className="text-xs font-medium text-red-800">Select or create a customer before taking this cash.</p>
      )}

      {customerId && hasPan && (
        <p className="text-xs text-amber-800">
          PAN on file: <span className="font-mono font-semibold">{(storedPan || capturedPan).toUpperCase()}</span>
        </p>
      )}

      {customerId && !isValidPan(storedPan) && (
        <label className="block text-xs font-medium text-gray-700">
          Customer PAN <span className="text-red-600">*</span>
          <input
            value={capturedPan}
            onChange={e => onPanChange(e.target.value.toUpperCase())}
            placeholder="AAAAA9999A"
            maxLength={10}
            className="mt-1 w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          />
          {capturedPan && !isValidPan(capturedPan) && (
            <span className="block text-red-600 mt-1">Use format AAAAA9999A</span>
          )}
        </label>
      )}
    </div>
  )
}
