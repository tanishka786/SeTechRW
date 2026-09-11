import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ScanLine, Tag, Printer, ShoppingBag, CheckCircle, AlertCircle } from 'lucide-react'
import { tagsApi, printQueueApi } from '../../api'
import { fmtCurrency, fmtWeight, fmtStoneSpecs } from '../../utils/format'
import { TagType } from '../../types'
import type { TagScanResult } from '../../types'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'

export default function ScanPage() {
  const [scanValue, setScanValue] = useState('')
  const [result, setResult] = useState<TagScanResult | null>(null)
  const [history, setHistory] = useState<TagScanResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const scanMutation = useMutation({
    mutationFn: tagsApi.scan,
    onSuccess: (data) => {
      setResult(data)
      setHistory(prev => [data, ...prev.slice(0, 9)])
      setScanValue('')
      inputRef.current?.focus()
    },
    onError: () => {
      toast.error('Tag not found')
      setScanValue('')
      inputRef.current?.focus()
    },
  })

  const printMutation = useMutation({
    mutationFn: (itemId: string) =>
      printQueueApi.enqueue({ jewelleryItemId: itemId, tagType: TagType.Barcode, labelTemplate: 'Default', copies: 1, priority: 5 }),
    onSuccess: () => toast.success('Added to print queue'),
  })

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanValue.trim()) return
    scanMutation.mutate(scanValue.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleScan(e)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tag Scan & Lookup</h1>
          <p className="text-sm text-gray-500">Scan barcode, QR code, or RFID EPC to look up jewellery items</p>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <ScanLine size={24} className="text-amber-700" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">Scan Tag</h2>
            <p className="text-sm text-gray-500">Barcode, QR, or RFID — any identifier works</p>
          </div>
        </div>

        <form onSubmit={handleScan} className="flex gap-3">
          <input
            ref={inputRef}
            value={scanValue}
            onChange={e => setScanValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scan barcode / QR / EPC…"
            className="flex-1 px-4 py-3 border-2 border-amber-300 rounded-xl text-lg focus:outline-none focus:border-amber-500 font-mono bg-amber-50"
            autoComplete="off"
          />
          <Button type="submit" size="lg" loading={scanMutation.isPending}>
            <ScanLine size={18} /> Lookup
          </Button>
        </form>

        <p className="mt-3 text-xs text-gray-400 text-center">
          This input captures scans automatically. Keep cursor in the field.
        </p>
      </div>

      {result && (
        <div className="card p-6 border-2 border-amber-200">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={20} className="text-green-600" />
            <h2 className="font-semibold text-green-700">
              {result.jewelleryItemId ? 'Item Found' : 'Unmapped Label'}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xl font-bold text-gray-900">{result.name}</p>
              {result.jewelleryItemId && (
                <p className="text-sm text-gray-500 mt-1">{result.category} · {result.metal} {result.purity}</p>
              )}
              <div className="mt-4 space-y-2">
                {[
                  ['Matched', `${result.matchedValue} (${result.matchedBy})`],
                  ['Barcode', result.barcodeValue || '—'],
                  ['QR Code', result.qrCodeValue ?? '—'],
                  ['RFID EPC', result.epc ?? '—'],
                  ['EPC Hex', result.epcHex ?? '—'],
                  ...(result.jewelleryItemId ? [
                    ['SKU', result.sku],
                    ['Gross Weight', fmtWeight(result.grossWeight)],
                    ['Net Weight', fmtWeight(result.netWeight)],
                    ...(fmtStoneSpecs(result) ? [['Diamond', fmtStoneSpecs(result)!]] as [string, string][] : []),
                    ['Hallmark', result.hallmarkNumber ?? '—'],
                    ['In Stock', result.quantityInStock.toString()],
                  ] as [string, string][] : []),
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-sm border-b border-gray-100 pb-1">
                    <span className="text-gray-500">{l}</span>
                    <span className="font-medium text-gray-800 font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              {result.jewelleryItemId ? (
                <>
                  <div className="bg-amber-50 rounded-xl p-4 text-center mb-4">
                    <p className="text-xs text-gray-500 mb-1">Selling Price</p>
                    <p className="text-3xl font-bold text-amber-700">{fmtCurrency(result.sellingPrice)}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button className="w-full" size="lg">
                      <ShoppingBag size={18} /> Add to Invoice
                    </Button>
                    <Button variant="outline" onClick={() => printMutation.mutate(result.jewelleryItemId!)} loading={printMutation.isPending}>
                      <Printer size={16} /> Print Label
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-4">
                  This label is in stock but not mapped to an inventory item yet. Map it when creating an item.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {scanMutation.isError && !result && (
        <div className="card p-4 border-red-200 bg-red-50 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500" />
          <p className="text-sm text-red-700">Tag not found. Please check the barcode / QR / EPC and try again.</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-800">Scan History</h2>
          </div>
          <div className="divide-y">
            {history.map((h, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => setResult(h)}>
                <div>
                  <p className="text-sm font-medium text-gray-900">{h.name}</p>
                  <p className="text-xs text-gray-500">{h.sku || '—'} · <Tag size={11} className="inline" /> {h.matchedValue} ({h.matchedBy})</p>
                </div>
                <span className="text-sm font-semibold text-gray-700">{h.jewelleryItemId ? fmtCurrency(h.sellingPrice) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
