import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { Plus, Trash2, Scale } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '../../api'
import Button from '../ui/Button'
import { fmtCurrency, fmtWeight } from '../../utils/format'
import { useAuthStore } from '../../store/authStore'
import type { CreateOldGoldExchangeItem } from '../../types'

export interface OldGoldDraft extends CreateOldGoldExchangeItem {
  fineWeight: number
  payableWeight: number
  creditAmount: number
  customPurity?: boolean
}

const PURITY_PRESETS = [
  { label: '24K (99.9%)', value: 99.9 },
  { label: '22K (91.6%)', value: 91.6 },
  { label: '18K (75%)', value: 75 },
  { label: '14K (58.5%)', value: 58.5 },
]

function calcOldGoldExchange(
  grossWeight: number,
  purityPercent: number,
  meltingLossPercent: number,
  buyingRatePerGram: number,
) {
  if (grossWeight <= 0 || buyingRatePerGram <= 0)
    return { fineWeight: 0, payableWeight: 0, creditAmount: 0 }
  const purity = Math.min(100, Math.max(0, purityPercent))
  const loss = Math.min(100, Math.max(0, meltingLossPercent))
  const fineWeight = Math.round(grossWeight * purity / 100 * 1000) / 1000
  const payableWeight = Math.round(fineWeight * (1 - loss / 100) * 1000) / 1000
  const creditAmount = Math.round(payableWeight * buyingRatePerGram * 100) / 100
  return { fineWeight, payableWeight, creditAmount }
}

function recompute(row: OldGoldDraft): OldGoldDraft {
  const purity = (row.xrfPurityPercent ?? 0) > 0 ? row.xrfPurityPercent! : row.purityPercent
  return { ...row, ...calcOldGoldExchange(row.grossWeight, purity, row.meltingLossPercent, row.buyingRatePerGram) }
}

function emptyRow(buyingRate: number): OldGoldDraft {
  return recompute({
    description: '',
    grossWeight: 0,
    purityPercent: 91.6,
    xrfPurityPercent: undefined,
    meltingLossPercent: 1,
    buyingRatePerGram: buyingRate,
    fineWeight: 0,
    payableWeight: 0,
    creditAmount: 0,
  })
}

interface Props {
  items: OldGoldDraft[]
  onChange: Dispatch<SetStateAction<OldGoldDraft[]>>
  autoFocusFirst?: boolean
}

export default function OldGoldCalculator({ items, onChange, autoFocusFirst }: Props) {
  const currencySymbol = useAuthStore(s => s.tenant?.currencySymbol) ?? '₹'
  const { data: rates } = useQuery({ queryKey: ['live-metal-rates'], queryFn: catalogApi.liveRates })
  const gold22 = rates?.find(r => /gold/i.test(r.metalName) && /22/i.test(r.purityName))
  const defaultRate = gold22?.ratePerGram ?? 0

  useEffect(() => {
    if (!defaultRate) return
    onChange(prev => {
      if (!prev.some(r => !r.buyingRatePerGram)) return prev
      return prev.map(r => r.buyingRatePerGram ? r : recompute({ ...r, buyingRatePerGram: defaultRate }))
    })
  }, [defaultRate, onChange])

  const update = (index: number, patch: Partial<OldGoldDraft>) => {
    onChange(items.map((row, i) => i === index ? recompute({ ...row, ...patch }) : row))
  }

  const totalCredit = items.reduce((s, r) => s + r.creditAmount, 0)
  const totalGross = items.reduce((s, r) => s + (Number(r.grossWeight) || 0), 0)
  const totalPayable = items.reduce((s, r) => s + r.payableWeight, 0)

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-gray-800 flex items-center gap-2">
          <Scale size={16} className="text-amber-700" /> Old gold exchange
        </p>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => onChange([...items, emptyRow(defaultRate || (items[0]?.buyingRatePerGram ?? 0))])}>
          <Plus size={14} /> Add piece
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Fine weight = gross × purity. Payable = fine after melting loss. Credit = payable × today’s buying rate.
        {gold22 && <> Default buying rate is live Gold 22K ({fmtCurrency(gold22.ratePerGram, currencySymbol)}/g).</>}
      </p>

      {items.length === 0 && (
        <button type="button"
          onClick={() => onChange([emptyRow(defaultRate)])}
          className="w-full py-6 border-2 border-dashed border-amber-200 rounded-xl text-sm text-amber-800 hover:bg-amber-50">
          Add old gold for exchange
        </button>
      )}

      {items.map((row, i) => (
        <div key={i} className="bg-white rounded-lg border border-amber-100 p-3 space-y-3">
          <div className="flex gap-2">
            <input
              value={row.description ?? ''}
              onChange={e => update(i, { description: e.target.value })}
              placeholder="e.g. Old bangles, chain…"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 px-1">
              <Trash2 size={15} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <label className="text-xs text-gray-600">
              Gross weight (g)
              <input type="number" min={0} step="0.001" value={row.grossWeight || ''}
                autoFocus={autoFocusFirst && i === 0}
                onChange={e => update(i, { grossWeight: Number(e.target.value) || 0 })}
                className="mt-1 w-full px-2 py-1.5 border rounded-lg text-sm" />
            </label>
            <label className="text-xs text-gray-600">
              Purity
              <select
                value={row.customPurity ? 'custom' : String(row.purityPercent)}
                onChange={e => {
                  if (e.target.value === 'custom') update(i, { customPurity: true })
                  else update(i, { customPurity: false, purityPercent: Number(e.target.value) })
                }}
                className="mt-1 w-full px-2 py-1.5 border rounded-lg text-sm bg-white">
                {PURITY_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                <option value="custom">Custom %</option>
              </select>
            </label>
            {row.customPurity && (
              <label className="text-xs text-gray-600">
                Custom purity %
                <input type="number" min={0} max={100} step="0.01" value={row.purityPercent || ''}
                  onChange={e => update(i, { purityPercent: Number(e.target.value) || 0 })}
                  className="mt-1 w-full px-2 py-1.5 border rounded-lg text-sm" />
              </label>
            )}
            <label className="text-xs text-gray-600">
              XRF reading %
              <input type="number" min={0} max={100} step="0.01" value={row.xrfPurityPercent ?? ''}
                placeholder="Optional"
                onChange={e => update(i, { xrfPurityPercent: e.target.value ? Number(e.target.value) : undefined })}
                className="mt-1 w-full px-2 py-1.5 border rounded-lg text-sm" />
            </label>
            <label className="text-xs text-gray-600">
              Melting loss %
              <input type="number" min={0} max={100} step="0.1" value={row.meltingLossPercent}
                onChange={e => update(i, { meltingLossPercent: Number(e.target.value) || 0 })}
                className="mt-1 w-full px-2 py-1.5 border rounded-lg text-sm" />
            </label>
            <label className="text-xs text-gray-600">
              Buying rate {currencySymbol}/g
              <input type="number" min={0} step="0.01" value={row.buyingRatePerGram || ''}
                onChange={e => update(i, { buyingRatePerGram: Number(e.target.value) || 0 })}
                className="mt-1 w-full px-2 py-1.5 border rounded-lg text-sm" />
            </label>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 bg-gray-50 rounded-md px-3 py-2">
            <span>Fine: <b>{fmtWeight(row.fineWeight)}</b></span>
            <span>After melt: <b>{fmtWeight(row.payableWeight)}</b></span>
            <span className="text-amber-800">Credit: <b>{fmtCurrency(row.creditAmount, currencySymbol)}</b></span>
          </div>
        </div>
      ))}

      {items.length > 0 && (
        <div className="flex justify-between items-center pt-1 text-sm">
          <span className="text-gray-600">
            {fmtWeight(totalGross)} gross · {fmtWeight(totalPayable)} payable
          </span>
          <span className="font-bold text-green-700">Exchange credit {fmtCurrency(totalCredit, currencySymbol)}</span>
        </div>
      )}
    </div>
  )
}
