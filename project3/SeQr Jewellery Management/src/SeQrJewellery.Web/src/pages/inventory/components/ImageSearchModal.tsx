import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Camera, Image as ImageIcon, RotateCcw } from 'lucide-react'
import { inventoryApi } from '../../../api'
import { fmtCurrency } from '../../../utils/format'
import type { JewelleryItem, ImageSearchResult } from '../../../types'
import Button from '../../../components/ui/Button'
import Spinner from '../../../components/ui/Spinner'

interface Props {
  onSelectItem: (item: JewelleryItem) => void
}

export default function ImageSearchModal({ onSelectItem }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [results, setResults] = useState<ImageSearchResult[] | null>(null)

  const searchMutation = useMutation({
    mutationFn: (file: File) => inventoryApi.searchByImage(file),
    onSuccess: setResults,
  })

  const pickFile = (file: File) => {
    setResults(null)
    setPreview(URL.createObjectURL(file))
    searchMutation.mutate(file)
  }

  const reset = () => {
    setPreview(null)
    setResults(null)
    searchMutation.reset()
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) pickFile(e.target.files[0]); e.target.value = '' }}
      />

      {!preview ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-xl py-12 text-center cursor-pointer transition-colors"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.[0]) pickFile(e.dataTransfer.files[0]) }}
        >
          <Camera size={32} className="mx-auto text-amber-500 mb-3" />
          <p className="text-sm font-medium text-gray-700">Take or upload a photo of the jewellery</p>
          <p className="text-xs text-gray-400 mt-1">We'll find the closest matching items in your inventory</p>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          <img src={preview} alt="Query" className="w-28 h-28 rounded-xl object-cover border border-gray-200 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {searchMutation.isPending ? 'Searching inventory…' : results ? `${results.length} match(es)` : ''}
            </p>
            <Button variant="outline" size="sm" onClick={reset}><RotateCcw size={13} /> New photo</Button>
          </div>
        </div>
      )}

      {searchMutation.isPending && (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      )}

      {searchMutation.isError && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {(searchMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? 'Image search failed.'}
        </p>
      )}

      {results && results.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-6">
          No matches found. Make sure your inventory items have photos uploaded.
        </p>
      )}

      {!!results?.length && (
        <div className="space-y-2 max-h-96 overflow-auto">
          {results.map(r => (
            <button
              key={r.item.id} type="button" onClick={() => onSelectItem(r.item)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50/40 transition-colors text-left"
            >
              {r.matchedMediaUrl || r.item.primaryImageUrl ? (
                <img src={r.matchedMediaUrl ?? r.item.primaryImageUrl} alt={r.item.name}
                  className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 shrink-0">
                  <ImageIcon size={18} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.item.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {r.item.sku} · {r.item.categoryName} · {r.item.metalName} {r.item.purityName}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-800">{fmtCurrency(r.item.sellingPrice)}</p>
                <p className={`text-xs font-medium ${r.score >= 0.85 ? 'text-green-600' : r.score >= 0.7 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {(r.score * 100).toFixed(0)}% match
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
