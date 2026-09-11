import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { catalogApi } from '../../api'
import { fmtCurrency } from '../../utils/format'
import { useAuthStore } from '../../store/authStore'

function shortPurity(name: string) {
  if (/24/i.test(name)) return '24K'
  if (/22/i.test(name)) return '22K'
  if (/18/i.test(name)) return '18K'
  if (/925/i.test(name)) return '925'
  if (/950/i.test(name)) return '950'
  return name
}

export default function RateTicker() {
  const { tenant } = useAuthStore()
  const sym = tenant?.currencySymbol ?? '₹'

  const { data: rates, dataUpdatedAt } = useQuery({
    queryKey: ['live-metal-rates'],
    queryFn: catalogApi.liveRates,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  if (!rates?.length) return null

  const updated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 text-amber-50 shrink-0">
      <div className="flex items-center gap-4 px-4 py-1.5 overflow-x-auto">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/90 shrink-0">Live rates</span>
        <div className="flex items-center gap-1 min-w-0">
          {rates.map((r, i) => {
            const change = r.changeAmount ?? 0
            const Trend = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus
            const trendClass = change > 0 ? 'text-emerald-300' : change < 0 ? 'text-red-300' : 'text-amber-200/70'
            return (
              <div key={`${r.metalId}-${r.purityId ?? i}`} className="flex items-center">
                {i > 0 && <span className="mx-3 h-4 w-px bg-amber-500/40" />}
                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-xs font-medium text-amber-100">
                    {r.metalName} {shortPurity(r.purityName)}
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {fmtCurrency(r.ratePerGram, sym)}
                    <span className="text-[10px] font-medium text-amber-200/80">/g</span>
                  </span>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] tabular-nums ${trendClass}`}>
                    <Trend size={11} />
                    {change !== 0 ? fmtCurrency(Math.abs(change), sym) : '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <Link
          to="/rate-history"
          className="ml-auto shrink-0 text-[10px] text-amber-200/80 hover:text-white underline-offset-2 hover:underline"
        >
          {updated ? `Updated ${updated}` : 'Rate history'}
        </Link>
      </div>
    </div>
  )
}
