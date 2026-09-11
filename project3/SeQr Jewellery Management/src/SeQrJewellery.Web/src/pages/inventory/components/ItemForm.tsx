import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ScanBarcode, Gem } from 'lucide-react'
import toast from 'react-hot-toast'
import { inventoryApi, catalogApi, tagsApi, mediaApi, certificatesApi } from '../../../api'
import { Input, Select, TextArea } from '../../../components/ui/Input'
import Combobox from '../../../components/ui/Combobox'
import Button from '../../../components/ui/Button'
import MediaManager from './MediaManager'
import CertificateFilesManager from './CertificateFilesManager'
import type { PendingCertificate } from './CertificateFilesManager'
import type { JewelleryItem, CreateJewelleryItemRequest, StockTagLookup, StockRangeLookup, SkuSuggestion } from '../../../types'
import { MakingChargeType } from '../../../types'

interface Props { item?: JewelleryItem; onSuccess: () => void }

const makingTypeOptions = [
  { value: String(MakingChargeType.Lumpsum), label: 'Lumpsum (₹)' },
  { value: String(MakingChargeType.PercentOfMetalRate), label: '% of metal value' },
  { value: String(MakingChargeType.PerGramAmount), label: '₹ per gram × weight' },
]

const STONE_CUTS = ['Ideal', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor']
const STONE_CLARITY = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'SI3', 'I1', 'I2', 'I3']
const STONE_COLORS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Fancy Yellow', 'Fancy Pink', 'Fancy Blue']
const CERT_LABS = ['GIA', 'IGI', 'HRD', 'SGL', 'GII', 'Other']

function computePreview(d: Partial<CreateJewelleryItemRequest>) {
  const net = Number(d.netWeight) || 0
  const rate = Number(d.metalRate) || 0
  const wastage = Number(d.wastagePercent) || 0
  const metalValue = net * rate * (1 + wastage / 100)
  const type = Number(d.makingChargeType) || MakingChargeType.Lumpsum
  const value = Number(d.makingChargeValue) || 0
  let making = 0
  if (type === MakingChargeType.PercentOfMetalRate) making = metalValue * value / 100
  else if (type === MakingChargeType.PerGramAmount) making = net * value
  else making = value || Number(d.makingCharges) || 0
  const sub = metalValue + making + (Number(d.stoneCharges) || 0) + (Number(d.otherCharges) || 0) - (Number(d.discount) || 0)
  const tax = Math.max(0, sub) * (Number(d.taxPercent) || 0) / 100
  return { metalValue, making, tax, selling: Math.max(0, sub) + tax }
}

export default function ItemForm({ item, onSuccess }: Props) {
  const isEdit = !!item
  const qc = useQueryClient()
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const { data: metals } = useQuery({ queryKey: ['metals'], queryFn: catalogApi.metals })
  const { data: liveRates } = useQuery({ queryKey: ['live-metal-rates'], queryFn: catalogApi.liveRates })
  const [tagInput, setTagInput] = useState('')
  const [tagLookup, setTagLookup] = useState<StockTagLookup | null>(null)
  const [tagChecking, setTagChecking] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingCerts, setPendingCerts] = useState<PendingCertificate[]>([])

  const [bulkMode, setBulkMode] = useState(false)
  const [bulkInput, setBulkInput] = useState<'scan' | 'range'>('scan')
  const [bulkTags, setBulkTags] = useState<StockTagLookup[]>([])
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [rangeLookup, setRangeLookup] = useState<StockRangeLookup | null>(null)
  const [rangeChecking, setRangeChecking] = useState(false)

  const [skuSuggestions, setSkuSuggestions] = useState<SkuSuggestion[]>([])
  const [showSkuDropdown, setShowSkuDropdown] = useState(false)
  const [existingSkuItem, setExistingSkuItem] = useState<JewelleryItem | null>(null)
  const [skuLookingUp, setSkuLookingUp] = useState(false)
  const skuDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resolvedChargeType = item
    ? (item.makingChargeType || (item.makingChargesPercent > 0 ? MakingChargeType.PercentOfMetalRate : MakingChargeType.Lumpsum))
    : MakingChargeType.Lumpsum
  const resolvedChargeValue = item
    ? (item.makingChargeValue > 0
      ? item.makingChargeValue
      : resolvedChargeType === MakingChargeType.PercentOfMetalRate
        ? item.makingChargesPercent
        : item.makingCharges)
    : 0

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } = useForm<CreateJewelleryItemRequest>({
    defaultValues: item ? {
      name: item.name, description: item.description, categoryId: item.categoryId,
      metalId: item.metalId, purityId: item.purityId, supplierId: item.supplierId,
      sku: item.sku,
      grossWeight: item.grossWeight, netWeight: item.netWeight, stoneWeight: item.stoneWeight,
      wastagePercent: item.wastagePercent, metalRate: item.metalRate, makingCharges: item.makingCharges,
      makingChargesPercent: item.makingChargesPercent ?? 0,
      makingChargeType: resolvedChargeType, makingChargeValue: resolvedChargeValue,
      stoneCharges: item.stoneCharges, otherCharges: item.otherCharges,
      discount: item.discount, taxPercent: item.taxPercent, costPrice: item.costPrice,
      initialStock: item.quantityInStock, isBISCertified: item.isBISCertified, isConsignment: false,
      location: item.location, size: item.size, hallmarkNumber: item.hallmarkNumber,
      certificateNumber: item.certificateNumber, certificateLab: item.certificateLab,
      stoneCarat: item.stoneCarat ?? undefined, stoneCut: item.stoneCut ?? '',
      stoneClarity: item.stoneClarity ?? '', stoneColor: item.stoneColor ?? '',
      design: item.design, style: item.style,
    } : {
      grossWeight: 0, netWeight: 0, stoneWeight: 0, wastagePercent: 3,
      metalRate: 6500, makingCharges: 0, makingChargesPercent: 0,
      makingChargeType: MakingChargeType.Lumpsum, makingChargeValue: 0,
      stoneCharges: 0, otherCharges: 0, discount: 0, taxPercent: 3,
      costPrice: 0, initialStock: 1, isBISCertified: true, isConsignment: false,
      mapTagValue: undefined, addToExistingSku: false,
    }
  })

  const selectedMetalId = watch('metalId')
  const selectedPurityId = watch('purityId')
  const selectedMetal = metals?.find(m => m.id === selectedMetalId)
  const purities = selectedMetal?.purities ?? []
  const mapTagValue = watch('mapTagValue')
  const skuValue = watch('sku')
  const formValues = watch()
  const preview = computePreview(formValues)
  const makingType = Number(watch('makingChargeType')) || MakingChargeType.Lumpsum

  useEffect(() => {
    if (isEdit || existingSkuItem) return
    const live = liveRates?.find(r => r.purityId === selectedPurityId)
    if (live) setValue('metalRate', live.ratePerGram)
    else if (selectedMetal) setValue('metalRate', selectedMetal.currentMarketRate)
  }, [selectedMetal, selectedPurityId, liveRates, isEdit, setValue, existingSkuItem])

  // Debounced SKU suggestions (create mode only)
  useEffect(() => {
    if (isEdit || bulkMode) return
    if (skuDebounceRef.current) clearTimeout(skuDebounceRef.current)
    const q = (skuValue ?? '').trim()
    if (q.length < 1) {
      setSkuSuggestions([])
      setShowSkuDropdown(false)
      return
    }
    skuDebounceRef.current = setTimeout(async () => {
      try {
        const list = await inventoryApi.skuSuggestions(q)
        setSkuSuggestions(list)
        setShowSkuDropdown(list.length > 0)
      } catch {
        setSkuSuggestions([])
      }
    }, 300)
    return () => { if (skuDebounceRef.current) clearTimeout(skuDebounceRef.current) }
  }, [skuValue, isEdit, bulkMode])

  const populateFromExisting = (existing: JewelleryItem) => {
    setExistingSkuItem(existing)
    setValue('sku', existing.sku)
    setValue('name', existing.name)
    setValue('description', existing.description ?? '')
    setValue('categoryId', existing.categoryId)
    setValue('metalId', existing.metalId)
    setValue('purityId', existing.purityId)
    setValue('supplierId', existing.supplierId)
    setValue('grossWeight', existing.grossWeight)
    setValue('netWeight', existing.netWeight)
    setValue('stoneWeight', existing.stoneWeight)
    setValue('stoneCarat', existing.stoneCarat ?? undefined)
    setValue('stoneCut', existing.stoneCut ?? '')
    setValue('stoneClarity', existing.stoneClarity ?? '')
    setValue('stoneColor', existing.stoneColor ?? '')
    setValue('certificateLab', existing.certificateLab ?? '')
    setValue('wastagePercent', existing.wastagePercent)
    setValue('metalRate', existing.metalRate)
    setValue('makingCharges', existing.makingCharges)
    setValue('makingChargesPercent', existing.makingChargesPercent ?? 0)
    setValue('makingChargeType', existing.makingChargeType || MakingChargeType.Lumpsum)
    setValue('makingChargeValue', existing.makingChargeValue > 0
      ? existing.makingChargeValue
      : (existing.makingChargesPercent > 0 ? existing.makingChargesPercent : existing.makingCharges))
    setValue('stoneCharges', existing.stoneCharges)
    setValue('otherCharges', existing.otherCharges)
    setValue('discount', existing.discount)
    setValue('taxPercent', existing.taxPercent)
    setValue('costPrice', existing.costPrice)
    setValue('location', existing.location)
    setValue('size', existing.size)
    setValue('design', existing.design)
    setValue('style', existing.style)
    setValue('hallmarkNumber', existing.hallmarkNumber)
    setValue('certificateNumber', existing.certificateNumber)
    setValue('isBISCertified', existing.isBISCertified)
    setValue('addToExistingSku', true)
    setValue('initialStock', 1)
    setShowSkuDropdown(false)
    toast.success(`Loaded details from SKU ${existing.sku}`)
  }

  const lookupSkuExact = async (sku: string) => {
    const trimmed = sku.trim()
    if (!trimmed || isEdit || bulkMode) return
    setSkuLookingUp(true)
    try {
      const existing = await inventoryApi.getBySku(trimmed)
      populateFromExisting(existing)
    } catch {
      // New SKU — clear existing banner
      if (existingSkuItem?.sku !== trimmed) {
        setExistingSkuItem(null)
        setValue('addToExistingSku', false)
      }
    } finally {
      setSkuLookingUp(false)
    }
  }

  const clearExistingSku = () => {
    setExistingSkuItem(null)
    setValue('addToExistingSku', false)
  }

  const mutation = useMutation({
    mutationFn: (data: CreateJewelleryItemRequest) =>
      isEdit ? inventoryApi.update(item!.id, data) : inventoryApi.create(data),
    onSuccess: async (created, variables) => {
      if (!isEdit && created?.id && !variables.addToExistingSku) {
        if (pendingFiles.length) {
          try {
            await mediaApi.upload(created.id, pendingFiles)
          } catch {
            toast.error('Item created, but uploading photos failed. You can add them by editing the item.')
          }
        }
        if (pendingCerts.length) {
          const byKind = new Map<string, File[]>()
          for (const p of pendingCerts) {
            const list = byKind.get(p.kind) ?? []
            list.push(p.file)
            byKind.set(p.kind, list)
          }
          try {
            for (const [kind, files] of byKind)
              await certificatesApi.upload(created.id, files, kind)
          } catch {
            toast.error('Item created, but uploading certificates failed. You can add them by editing the item.')
          }
        }
      }
      toast.success(
        isEdit
          ? 'Item updated!'
          : variables.addToExistingSku
            ? `Stock added to SKU ${variables.sku}!`
            : 'Item created!',
      )
      onSuccess()
    },
  })

  const bulkMutation = useMutation({
    mutationFn: (data: CreateJewelleryItemRequest) =>
      inventoryApi.bulkCreate({
        ...data,
        tagValues: bulkInput === 'scan' ? bulkTags.map(t => t.matchedValue) : undefined,
        referenceFrom: bulkInput === 'range' ? Number(rangeFrom) : undefined,
        referenceTo: bulkInput === 'range' ? Number(rangeTo) : undefined,
      }),
    onSuccess: (r) => {
      toast.success(`Created ${r.createdCount} items (${r.firstSku} – ${r.lastSku})`)
      onSuccess()
    },
  })

  const verifyBulkTag = async () => {
    const value = tagInput.trim()
    if (!value) return
    setTagChecking(true)
    try {
      const result = await tagsApi.lookupStock(value)
      if (!result.isAvailable) {
        toast.error(result.message)
      } else if (bulkTags.some(t => t.id === result.id)) {
        toast.error('Tag already in the list')
      } else {
        setBulkTags(prev => [...prev, result])
        setTagInput('')
      }
    } catch {
      toast.error(`No tag found for '${value}'`)
    } finally {
      setTagChecking(false)
    }
  }

  const validateRange = async () => {
    const from = Number(rangeFrom)
    const to = Number(rangeTo)
    if (!rangeFrom || !rangeTo || Number.isNaN(from) || Number.isNaN(to)) {
      toast.error('Enter a valid reference number range')
      return
    }
    setRangeChecking(true)
    try {
      setRangeLookup(await tagsApi.lookupStockRange(from, to))
    } catch {
      toast.error('Failed to validate range')
    } finally {
      setRangeChecking(false)
    }
  }

  const bulkCount = bulkInput === 'scan'
    ? bulkTags.length
    : (rangeLookup?.isAvailable ? rangeLookup.requested : 0)

  const verifyTag = async () => {
    const value = tagInput.trim()
    if (!value) {
      setTagLookup(null)
      setValue('mapTagValue', undefined)
      return
    }
    setTagChecking(true)
    try {
      const result = await tagsApi.lookupStock(value)
      setTagLookup(result)
      setValue('mapTagValue', result.isAvailable ? result.matchedValue : undefined)
    } catch {
      setTagLookup({ matchedValue: value, isAvailable: false, message: `No tag found for '${value}'.` })
      setValue('mapTagValue', undefined)
    } finally {
      setTagChecking(false)
    }
  }

  const clearMappedTag = () => {
    setTagInput('')
    setTagLookup(null)
    setValue('mapTagValue', undefined)
  }

  const categoryOptions = categories
    ?.filter(c => !c.parentCategoryId)
    .flatMap(c => [
      { value: c.id, label: c.name },
      ...(c.subCategories ?? []).map(s => ({ value: s.id, label: s.name, indent: true })),
    ]) ?? []

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => catalogApi.createCategory({ name }),
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setValue('categoryId', cat.id, { shouldValidate: true })
      toast.success(`Category "${cat.name}" created`)
    },
    onError: () => toast.error('Failed to create category'),
  })

  const metalOptions = [{ value: '', label: '-- Select Metal --' }, ...(metals?.map(m => ({ value: m.id, label: `${m.name} (${m.symbol})` })) ?? [])]
  const purityOptions = [{ value: '', label: '-- Select Purity --' }, ...(purities.map(p => ({ value: p.id, label: `${p.name} (${p.purityPercentage}%)` })))]

  const submit = (d: CreateJewelleryItemRequest) => {
    const type = Number(d.makingChargeType) || MakingChargeType.Lumpsum
    const value = Number(d.makingChargeValue) || 0
    const payload: CreateJewelleryItemRequest = {
      ...d,
      sku: d.sku?.trim() ? d.sku.trim() : undefined,
      mapTagValue: d.mapTagValue?.trim() ? d.mapTagValue.trim() : undefined,
      stoneCarat: Number(d.stoneCarat) > 0 ? Number(d.stoneCarat) : 0,
      stoneCut: d.stoneCut ?? '',
      stoneClarity: d.stoneClarity ?? '',
      stoneColor: d.stoneColor ?? '',
      certificateLab: d.certificateLab ?? '',
      makingChargeType: type,
      makingChargeValue: value,
      makingCharges: type === MakingChargeType.Lumpsum ? value : 0,
      makingChargesPercent: type === MakingChargeType.PercentOfMetalRate ? value : 0,
      addToExistingSku: !!existingSkuItem && !bulkMode,
    }
    if (bulkMode) {
      if (bulkInput === 'scan' && bulkTags.length === 0) {
        toast.error('Scan at least one tag')
        return
      }
      if (bulkInput === 'range' && !rangeLookup?.isAvailable) {
        toast.error('Validate an available reference number range first')
        return
      }
      bulkMutation.mutate({ ...payload, mapTagValue: undefined, addToExistingSku: false })
    } else {
      mutation.mutate(payload)
    }
  }

  const makingValueLabel =
    makingType === MakingChargeType.PercentOfMetalRate ? 'Making % of metal'
      : makingType === MakingChargeType.PerGramAmount ? 'Making ₹ per gram'
        : 'Making Charges (₹)'

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      {!isEdit && (
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
          <button type="button" onClick={() => { setBulkMode(false) }}
            className={`flex-1 py-2 ${!bulkMode ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Single Item
          </button>
          <button type="button" onClick={() => { setBulkMode(true); clearExistingSku() }}
            className={`flex-1 py-2 ${bulkMode ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            Bulk (multiple pieces)
          </button>
        </div>
      )}

      {!isEdit && bulkMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <ScanBarcode size={16} />
              Map multiple tags — one item per tag
            </div>
            <div className="flex rounded-md border border-amber-300 overflow-hidden text-xs font-medium">
              <button type="button" onClick={() => setBulkInput('scan')}
                className={`px-3 py-1 ${bulkInput === 'scan' ? 'bg-amber-600 text-white' : 'bg-white text-amber-700'}`}>
                Scan tags
              </button>
              <button type="button" onClick={() => setBulkInput('range')}
                className={`px-3 py-1 ${bulkInput === 'range' ? 'bg-amber-600 text-white' : 'bg-white text-amber-700'}`}>
                Reference range
              </button>
            </div>
          </div>
          <p className="text-xs text-amber-800/80">
            Each tag creates its own item (quantity 1) with the same details. SKUs get a running suffix, e.g. RING-22K-001, RING-22K-002…
          </p>

          {bulkInput === 'scan' ? (
            <>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    label="Scan Barcode / QR / EPC / Hex"
                    placeholder="Scan or type, then press Enter"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void verifyBulkTag()
                      }
                    }}
                  />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void verifyBulkTag()} loading={tagChecking}>
                  Add
                </Button>
              </div>
              {bulkTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {bulkTags.map(t => (
                    <span key={t.id} className="inline-flex items-center gap-1 bg-white border border-amber-300 text-amber-900 rounded-full px-2.5 py-1 text-xs font-mono">
                      {t.barcodeValue ?? t.matchedValue}
                      <button type="button" onClick={() => setBulkTags(prev => prev.filter(x => x.id !== t.id))}
                        className="text-amber-400 hover:text-red-500 font-sans">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-amber-800">{bulkTags.length} tag(s) scanned</p>
            </>
          ) : (
            <>
              <div className="flex gap-2 items-end">
                <Input label="Reference from" type="number" placeholder="e.g. 1" value={rangeFrom}
                  onChange={e => { setRangeFrom(e.target.value); setRangeLookup(null) }} />
                <Input label="Reference to" type="number" placeholder="e.g. 100" value={rangeTo}
                  onChange={e => { setRangeTo(e.target.value); setRangeLookup(null) }} />
                <Button type="button" variant="outline" size="sm" onClick={() => void validateRange()} loading={rangeChecking}>
                  Validate
                </Button>
              </div>
              {rangeLookup && (
                <p className={`text-sm rounded-md px-3 py-2 ${rangeLookup.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                  {rangeLookup.message}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {!isEdit && !bulkMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <ScanBarcode size={16} />
            Map preprinted tag (optional)
          </div>
          <p className="text-xs text-amber-800/80">
            Scan or enter barcode, QR code, RFID EPC, or EPC hex. The tag must already exist in stock and not be mapped to another item.
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Barcode / QR / EPC / Hex"
                placeholder="Scan or type SQ12 / QR / EPC / Hex"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void verifyTag()
                  }
                }}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void verifyTag()} loading={tagChecking}>
              Verify
            </Button>
            {mapTagValue && (
              <Button type="button" variant="ghost" size="sm" onClick={clearMappedTag}>
                Clear
              </Button>
            )}
          </div>
          {tagLookup && (
            <p className={`text-sm rounded-md px-3 py-2 ${tagLookup.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
              {tagLookup.isAvailable
                ? `Ready to map: ${tagLookup.barcodeValue ?? tagLookup.matchedValue}${tagLookup.epc ? ` · EPC ${tagLookup.epc}` : ''}${tagLookup.epcHex ? ` · Hex ${tagLookup.epcHex}` : ''}${tagLookup.qrCodeValue ? ` · QR ${tagLookup.qrCodeValue}` : ''} (matched via ${tagLookup.matchedBy})`
                : tagLookup.message}
            </p>
          )}
          <input type="hidden" {...register('mapTagValue')} />
        </div>
      )}

      {existingSkuItem && !isEdit && !bulkMode && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-900">
            Existing SKU — saving will add stock to this item
          </p>
          <p className="text-xs text-blue-800">
            SKU <span className="font-mono font-semibold">{existingSkuItem.sku}</span> currently has{' '}
            <strong>{existingSkuItem.quantityInStock}</strong> in stock. Details below were populated from the existing item.
            Enter how many units to add in Initial Stock.
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={clearExistingSku}>
            Clear &amp; use as new SKU
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input label="Item Name *" placeholder="e.g. Gold Necklace" {...register('name', { required: 'Required' })} error={errors.name?.message} className="col-span-2" />
        <Controller
          name="categoryId"
          control={control}
          rules={{ required: 'Required' }}
          render={({ field }) => (
            <Combobox
              label="Category *"
              placeholder="Type to search categories…"
              options={categoryOptions}
              value={field.value ?? ''}
              onChange={v => field.onChange(v)}
              onCreate={name => createCategoryMutation.mutate(name)}
              createLabel={name => `Create category "${name}"`}
              loading={createCategoryMutation.isPending}
              error={errors.categoryId?.message}
            />
          )}
        />
        <div className="relative">
          <Input
            label={bulkMode ? 'Base SKU (suffix added per piece)' : 'SKU'}
            placeholder="Type existing SKU to autofill, or leave blank"
            disabled={isEdit}
            {...register('sku')}
            onBlur={e => { void lookupSkuExact(e.target.value) }}
            onFocus={() => { if (skuSuggestions.length) setShowSkuDropdown(true) }}
            autoComplete="off"
          />
          {skuLookingUp && <p className="text-xs text-gray-500 mt-1">Looking up SKU…</p>}
          {showSkuDropdown && !isEdit && !bulkMode && skuSuggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg text-sm">
              {skuSuggestions.map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-amber-50 flex flex-col gap-0.5"
                    onMouseDown={async e => {
                      e.preventDefault()
                      try {
                        const full = await inventoryApi.getBySku(s.sku)
                        populateFromExisting(full)
                      } catch {
                        toast.error('Failed to load SKU details')
                      }
                    }}
                  >
                    <span className="font-mono font-semibold text-amber-800">{s.sku}</span>
                    <span className="text-xs text-gray-600 truncate">
                      {s.name} · {s.metalName} {s.purityName} · Stock {s.quantityInStock}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <TextArea label="Description" placeholder="Item description…" {...register('description')} />

      {!bulkMode && (
        <MediaManager
          itemId={isEdit ? item!.id : undefined}
          pendingFiles={pendingFiles}
          onPendingChange={setPendingFiles}
        />
      )}

      <div className="grid grid-cols-3 gap-4">
        <Select label="Metal *" options={metalOptions} {...register('metalId', { required: 'Required' })} error={errors.metalId?.message} />
        <Select label="Purity *" options={purityOptions} {...register('purityId', { required: 'Required' })} error={errors.purityId?.message} />
        <Input label="Metal Rate (₹/g)" type="number" step="0.01" {...register('metalRate', { valueAsNumber: true })} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Input label="Gross Weight (g) *" type="number" step="0.001" {...register('grossWeight', { required: 'Required', valueAsNumber: true })} error={errors.grossWeight?.message} />
        <Input label="Net Weight (g)" type="number" step="0.001" {...register('netWeight', { valueAsNumber: true })} />
        <Input
          label="Stone Weight (g)"
          type="number"
          step="0.001"
          {...register('stoneWeight', {
            valueAsNumber: true,
            onChange: e => {
              const grams = Number(e.target.value)
              if (grams > 0 && !(Number(watch('stoneCarat')) > 0))
                setValue('stoneCarat', Math.round(grams / 0.2 * 1000) / 1000)
            },
          })}
        />
        <Input label="Wastage %" type="number" step="0.1" {...register('wastagePercent', { valueAsNumber: true })} />
      </div>

      <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Gem size={16} className="text-violet-700" /> Diamond / stone specs
        </p>
        <p className="text-xs text-gray-500">4Cs for the centre stone. 1 carat = 0.2 g. Lab + report ID is the GIA/IGI certificate — attach the PDF or scan below.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input
            label="Carat"
            type="number"
            step="0.01"
            placeholder="e.g. 0.50"
            {...register('stoneCarat', {
              valueAsNumber: true,
              onChange: e => {
                const ct = Number(e.target.value)
                if (ct > 0 && !(Number(watch('stoneWeight')) > 0))
                  setValue('stoneWeight', Math.round(ct * 0.2 * 1000) / 1000)
              },
            })}
          />
          <Select
            label="Cut"
            options={[{ value: '', label: '—' }, ...STONE_CUTS.map(v => ({ value: v, label: v }))]}
            {...register('stoneCut')}
          />
          <Select
            label="Clarity"
            options={[{ value: '', label: '—' }, ...STONE_CLARITY.map(v => ({ value: v, label: v }))]}
            {...register('stoneClarity')}
          />
          <Select
            label="Color"
            options={[{ value: '', label: '—' }, ...STONE_COLORS.map(v => ({ value: v, label: v }))]}
            {...register('stoneColor')}
          />
          <Select
            label="Lab"
            options={[{ value: '', label: '—' }, ...CERT_LABS.map(v => ({ value: v, label: v }))]}
            {...register('certificateLab')}
          />
          <div className="md:col-span-3">
            <Input label="GIA / IGI ID" placeholder="Report number" {...register('certificateNumber')} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800">Making Charges</p>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Charge Type"
            options={makingTypeOptions}
            {...register('makingChargeType', { valueAsNumber: true })}
          />
          <Input
            label={makingValueLabel}
            type="number"
            step="0.01"
            {...register('makingChargeValue', { valueAsNumber: true })}
          />
        </div>
        <p className="text-xs text-gray-500">
          {makingType === MakingChargeType.Lumpsum && 'Fixed lumpsum amount added to the item price.'}
          {makingType === MakingChargeType.PercentOfMetalRate && 'Percentage of metal value (net weight × rate × wastage).'}
          {makingType === MakingChargeType.PerGramAmount && 'Amount per gram × net weight of metal.'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input label="Stone Charges (₹)" type="number" step="0.01" {...register('stoneCharges', { valueAsNumber: true })} />
        <Input label="Other Charges (₹)" type="number" step="0.01" {...register('otherCharges', { valueAsNumber: true })} />
        <Input label="Discount (₹)" type="number" step="0.01" {...register('discount', { valueAsNumber: true })} />
        <Input label="GST %" type="number" step="0.1" {...register('taxPercent', { valueAsNumber: true })} />
        <Input label="Cost Price (₹)" type="number" step="0.01" {...register('costPrice', { valueAsNumber: true })} />
      </div>

      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 grid grid-cols-4 gap-3 text-sm">
        <div><span className="text-gray-500 block text-xs">Metal Value</span><span className="font-semibold">₹{preview.metalValue.toFixed(2)}</span></div>
        <div><span className="text-gray-500 block text-xs">Making</span><span className="font-semibold">₹{preview.making.toFixed(2)}</span></div>
        <div><span className="text-gray-500 block text-xs">Tax</span><span className="font-semibold">₹{preview.tax.toFixed(2)}</span></div>
        <div><span className="text-gray-500 block text-xs">Selling Price</span><span className="font-semibold text-amber-700">₹{preview.selling.toFixed(2)}</span></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {bulkMode ? (
          <Input label="Stock per Piece" value="1" disabled />
        ) : (
          <Input
            label={isEdit ? 'Quantity in Stock' : existingSkuItem ? 'Units to Add' : 'Initial Stock'}
            type="number"
            {...register('initialStock', { valueAsNumber: true })}
          />
        )}
        <Input label="Hallmark No." {...register('hallmarkNumber')} />
        <Input label="Size" placeholder="e.g. 18 (ring), 16 inch" {...register('size')} />
        <Input label="Location" placeholder="Shelf/Drawer location" {...register('location')} />
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isBISCertified')} className="rounded text-amber-600" />
          BIS Certified
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('isConsignment')} className="rounded text-amber-600" />
          Consignment Item
        </label>
      </div>

      {!bulkMode && (
        <CertificateFilesManager
          itemId={isEdit ? item!.id : undefined}
          pending={pendingCerts}
          onPendingChange={setPendingCerts}
          defaultKind={watch('certificateLab') || (watch('isBISCertified') ? 'BIS' : 'GIA')}
        />
      )}

      {mutation.isError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{String(mutation.error)}</p>}
      {bulkMutation.isError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{String(bulkMutation.error)}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={isSubmitting || mutation.isPending || bulkMutation.isPending}>
          {isEdit
            ? 'Update Item'
            : bulkMode
              ? `Create ${bulkCount || ''} Items`.replace('  ', ' ')
              : existingSkuItem
                ? 'Add Stock to Existing SKU'
                : 'Create Item'}
        </Button>
      </div>
    </form>
  )
}
