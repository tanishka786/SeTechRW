import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag, Printer, Plus, FileText, ExternalLink } from 'lucide-react'
import { tagsApi, printQueueApi, mediaApi, certificatesApi } from '../../../api'
import { fmtCurrency, fmtWeight, fmtDate, fmtStoneSpecs, fmtCarat } from '../../../utils/format'
import { TagType } from '../../../types'
import type { JewelleryItem } from '../../../types'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import toast from 'react-hot-toast'

export default function ItemDetail({ item }: { item: JewelleryItem }) {
  const qc = useQueryClient()
  const [activeMedia, setActiveMedia] = useState(0)
  const { data: tags, isLoading } = useQuery({
    queryKey: ['item-tags', item.id],
    queryFn: () => tagsApi.getForItem(item.id),
  })
  const { data: media } = useQuery({
    queryKey: ['item-media', item.id],
    queryFn: () => mediaApi.listForItem(item.id),
    initialData: item.media,
  })
  const { data: certificates } = useQuery({
    queryKey: ['item-certificates', item.id],
    queryFn: () => certificatesApi.list(item.id),
  })
  const gallery = (media ?? []).filter(m => m.mediaType !== 'Document')

  const printMutation = useMutation({
    mutationFn: () => printQueueApi.enqueue({ jewelleryItemId: item.id, tagType: TagType.Barcode, labelTemplate: 'Default', copies: 1, priority: 5 }),
    onSuccess: () => toast.success('Added to print queue'),
  })

  const genBarcodeMutation = useMutation({
    mutationFn: () => tagsApi.generateBarcode(item.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['item-tags', item.id] }); toast.success('Barcode generated') },
  })

  const fields = [
    ['SKU', item.sku], ['Category', item.categoryName], ['Metal', item.metalName],
    ['Purity', item.purityName], ['Supplier', item.supplierName ?? '—'],
    ['Gross Weight', fmtWeight(item.grossWeight)], ['Net Weight', fmtWeight(item.netWeight)],
    ['Stone Weight', fmtWeight(item.stoneWeight)],
    ...(item.stoneCarat || item.stoneCut || item.stoneClarity || item.stoneColor || item.certificateLab || item.certificateNumber
      ? [
          ['Carat', item.stoneCarat && item.stoneCarat > 0 ? fmtCarat(item.stoneCarat) : '—'],
          ['Cut', item.stoneCut ?? '—'],
          ['Clarity', item.stoneClarity ?? '—'],
          ['Color (stone)', item.stoneColor ?? '—'],
          ['Lab / report', fmtStoneSpecs({ certificateLab: item.certificateLab, certificateNumber: item.certificateNumber }) ?? '—'],
        ] as [string, string][]
      : []),
    ['Metal Rate', fmtCurrency(item.metalRate) + '/g'],
    ['Metal Value', fmtCurrency(item.metalValue)], ['Making Charges', fmtCurrency(item.makingCharges)],
    ['Stone Charges', fmtCurrency(item.stoneCharges)], ['Tax', `${item.taxPercent}% (${fmtCurrency(item.taxAmount)})`],
    ['Discount', fmtCurrency(item.discount)], ['Cost Price', fmtCurrency(item.costPrice)],
    ['Selling Price', fmtCurrency(item.sellingPrice)], ['Stock', item.quantityInStock.toString()],
    ['Location', item.location ?? '—'], ['Hallmark', item.hallmarkNumber ?? '—'],
    ['BIS Certified', item.isBISCertified ? 'Yes' : 'No'],
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
          {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => genBarcodeMutation.mutate()} loading={genBarcodeMutation.isPending}>
            <Tag size={14} /> Generate Tag
          </Button>
          <Button size="sm" onClick={() => printMutation.mutate()} loading={printMutation.isPending}>
            <Printer size={14} /> Print Label
          </Button>
        </div>
      </div>

      {/* Media gallery */}
      {!!gallery.length && (
        <div className="space-y-2">
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
            {gallery[Math.min(activeMedia, gallery.length - 1)]?.mediaType === 'Video' ? (
              <video
                key={gallery[Math.min(activeMedia, gallery.length - 1)].id}
                src={gallery[Math.min(activeMedia, gallery.length - 1)].url}
                controls className="max-h-full max-w-full"
              />
            ) : (
              <img
                src={gallery[Math.min(activeMedia, gallery.length - 1)]?.url}
                alt={item.name}
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((m, i) => (
                <button
                  key={m.id} type="button" onClick={() => setActiveMedia(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 ${
                    i === Math.min(activeMedia, gallery.length - 1) ? 'border-amber-500' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {m.mediaType === 'Video'
                    ? <video src={m.url} className="w-full h-full object-cover" muted />
                    : <img src={m.url} alt="" className="w-full h-full object-cover" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {fields.map(([label, value]) => (
          <div key={label} className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-xs text-gray-500">{label}</span>
            <span className="text-xs font-medium text-gray-800">{value}</span>
          </div>
        ))}
      </div>

      {!!certificates?.length && (
        <div>
          <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2 mb-3">
            <FileText size={15} /> Certificates
          </h4>
          <ul className="space-y-2">
            {certificates.map(c => (
              <li key={c.id} className="flex items-center justify-between p-3 bg-sky-50 rounded-lg">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.fileName}</p>
                  <p className="text-xs text-gray-500">{c.certificateKind || 'Certificate'}</p>
                </div>
                <a href={c.url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline shrink-0 ml-3">
                  <ExternalLink size={13} /> Open
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2"><Tag size={15} /> Tags</h4>
          <Button variant="ghost" size="sm"><Plus size={14} /> Add Tag</Button>
        </div>
        {isLoading ? <p className="text-sm text-gray-400">Loading…</p> : tags?.length ? (
          <div className="space-y-2">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-mono text-sm text-gray-800">{tag.barcodeValue}</p>
                  <p className="text-xs text-gray-500">
                    {[
                      tag.qrCodeValue && `QR ${tag.qrCodeValue}`,
                      tag.epc && `RFID ${tag.epc}`,
                      tag.epcHex && `Hex ${tag.epcHex}`,
                      tag.isPrimary ? 'Primary' : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={tag.isActive ? 'Active' : 'Inactive'} colorClass={tag.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} />
                  <span className="text-xs text-gray-400">Printed: {tag.printCount}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400">No tags assigned</p>}
      </div>
    </div>
  )
}
