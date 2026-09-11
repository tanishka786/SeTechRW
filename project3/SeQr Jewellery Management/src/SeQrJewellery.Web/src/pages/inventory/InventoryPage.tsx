import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Filter, Printer, Eye, Edit, Trash2, RefreshCw, Image as ImageIcon, Camera, X, ArrowUpDown } from 'lucide-react'
import { inventoryApi, catalogApi, printQueueApi } from '../../api'
import { fmtCurrency, fmtWeight, fmtDate, fmtStoneSpecs } from '../../utils/format'
import { TagType } from '../../types'
import Button from '../../components/ui/Button'
import Combobox from '../../components/ui/Combobox'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import ItemForm from './components/ItemForm'
import ItemDetail from './components/ItemDetail'
import ImageSearchModal from './components/ImageSearchModal'
import type { JewelleryItem, JewelleryItemFilter } from '../../types'
import toast from 'react-hot-toast'

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'weight_asc', label: 'Weight: Low to High' },
  { value: 'weight_desc', label: 'Weight: High to Low' },
  { value: 'name_asc', label: 'Name: A-Z' },
  { value: 'newest', label: 'Newest First' },
]

type AdvancedFilters = Partial<Pick<JewelleryItemFilter,
  'purityId' | 'minPrice' | 'maxPrice' | 'minWeight' | 'maxWeight' | 'location' | 'design' | 'style' | 'hallmarkedOnly' | 'inStock'
>>

export default function InventoryPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [metalId, setMetalId] = useState('')
  const [sort, setSort] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [showImageSearch, setShowImageSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [editItem, setEditItem] = useState<JewelleryItem | null>(null)
  const [viewItem, setViewItem] = useState<JewelleryItem | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [advanced, setAdvanced] = useState<AdvancedFilters>({})
  const [draftAdvanced, setDraftAdvanced] = useState<AdvancedFilters>({})

  const sortMap: Record<string, { sortBy: string; sortDescending: boolean }> = {
    price_asc: { sortBy: 'price', sortDescending: false }, price_desc: { sortBy: 'price', sortDescending: true },
    weight_asc: { sortBy: 'weight', sortDescending: false }, weight_desc: { sortBy: 'weight', sortDescending: true },
    name_asc: { sortBy: 'name', sortDescending: false }, newest: { sortBy: 'created', sortDescending: true },
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['inventory', search, categoryId, metalId, sort, advanced, page],
    queryFn: () => inventoryApi.list({
      searchTerm: search || undefined,
      categoryId: categoryId || undefined,
      metalId: metalId || undefined,
      ...advanced,
      ...(sortMap[sort] ?? {}),
      pageNumber: page,
      pageSize: 20,
    }),
  })

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const { data: metals } = useQuery({ queryKey: ['metals'], queryFn: catalogApi.metals })
  const selectedMetal = useMemo(() => metals?.find(m => m.id === metalId), [metals, metalId])

  const activeFilterChips = useMemo(() => {
    const chips: { key: keyof AdvancedFilters; label: string }[] = []
    if (advanced.purityId) chips.push({ key: 'purityId', label: `Purity: ${selectedMetal?.purities?.find(p => p.id === advanced.purityId)?.name ?? ''}` })
    if (advanced.minPrice) chips.push({ key: 'minPrice', label: `Min ₹${advanced.minPrice}` })
    if (advanced.maxPrice) chips.push({ key: 'maxPrice', label: `Max ₹${advanced.maxPrice}` })
    if (advanced.minWeight) chips.push({ key: 'minWeight', label: `Min ${advanced.minWeight}g` })
    if (advanced.maxWeight) chips.push({ key: 'maxWeight', label: `Max ${advanced.maxWeight}g` })
    if (advanced.location) chips.push({ key: 'location', label: `Location: ${advanced.location}` })
    if (advanced.design) chips.push({ key: 'design', label: `Design: ${advanced.design}` })
    if (advanced.style) chips.push({ key: 'style', label: `Style: ${advanced.style}` })
    if (advanced.hallmarkedOnly) chips.push({ key: 'hallmarkedOnly', label: 'Hallmarked only' })
    if (advanced.inStock) chips.push({ key: 'inStock', label: 'In stock only' })
    return chips
  }, [advanced, selectedMetal])

  const removeChip = (key: keyof AdvancedFilters) => {
    setAdvanced(prev => { const next = { ...prev }; delete next[key]; return next })
    setPage(1)
  }

  const applyFilters = () => { setAdvanced(draftAdvanced); setPage(1); setShowFilters(false) }
  const clearFilters = () => { setAdvanced({}); setDraftAdvanced({}); setPage(1); setShowFilters(false) }
  const openFilters = () => { setDraftAdvanced(advanced); setShowFilters(true) }

  const handleRefresh = () => {
    setSearch('')
    setCategoryId('')
    setMetalId('')
    setSort('')
    setAdvanced({})
    setDraftAdvanced({})
    setPage(1)
    setSelected(new Set())
    void qc.invalidateQueries({ queryKey: ['inventory'] })
  }

  const deleteMutation = useMutation({
    mutationFn: inventoryApi.delete,
    onSuccess: () => { toast.success('Item deleted'); qc.invalidateQueries({ queryKey: ['inventory'] }) },
    onError: () => toast.error('Failed to delete item'),
  })

  const printMutation = useMutation({
    mutationFn: (itemId: string) => printQueueApi.enqueue({ jewelleryItemId: itemId, tagType: TagType.Barcode, labelTemplate: 'Default', copies: 1, priority: 5 }),
    onSuccess: () => toast.success('Added to print queue'),
    onError: () => toast.error('Failed to add to print queue'),
  })

  const handleBatchPrint = async () => {
    if (!selected.size) return
    await printQueueApi.batchEnqueue([...selected], { tagType: TagType.Barcode, labelTemplate: 'Default', copies: 1, priority: 5 })
    toast.success(`${selected.size} items queued for printing`)
    setSelected(new Set())
  }

  const toggleSelect = (id: string) => {
    const n = new Set(selected)
    if (n.has(id)) n.delete(id); else n.add(id)
    setSelected(n)
  }

  const columns = [
    {
      key: 'select', header: '',
      render: (row: JewelleryItem) => (
        <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} className="rounded text-amber-600" onClick={e => e.stopPropagation()} />
      ), className: 'w-10 pl-4'
    },
    { key: 'sku', header: 'SKU', render: (r: JewelleryItem) => <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.sku}</span> },
    { key: 'name', header: 'Item', render: (r: JewelleryItem) => (
      <div className="flex items-center gap-3">
        {r.primaryImageUrl ? (
          <img src={r.primaryImageUrl} alt={r.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center text-gray-300">
            <ImageIcon size={16} />
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900">{r.name}</p>
          <p className="text-xs text-gray-500">{r.categoryName} · {r.metalName} {r.purityName}</p>
          {fmtStoneSpecs(r) && <p className="text-[11px] text-violet-700 mt-0.5">{fmtStoneSpecs(r)}</p>}
        </div>
      </div>
    )},
    { key: 'weight', header: 'Weight', render: (r: JewelleryItem) => (
      <div>
        <p>{fmtWeight(r.grossWeight)}</p>
        <p className="text-xs text-gray-400">Net: {fmtWeight(r.netWeight)}</p>
      </div>
    )},
    { key: 'sellingPrice', header: 'Price', render: (r: JewelleryItem) => <span className="font-semibold">{fmtCurrency(r.sellingPrice)}</span> },
    { key: 'quantityInStock', header: 'Stock', render: (r: JewelleryItem) => (
      <span className={`font-medium ${r.quantityInStock === 0 ? 'text-red-600' : r.quantityInStock <= 2 ? 'text-amber-600' : 'text-green-600'}`}>
        {r.quantityInStock}
      </span>
    )},
    { key: 'isActive', header: 'Status', render: (r: JewelleryItem) => (
      <span className={`badge ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
    )},
    { key: 'actions', header: '', render: (r: JewelleryItem) => (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => setViewItem(r)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Eye size={15} /></button>
        <button onClick={() => setEditItem(r)} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg"><Edit size={15} /></button>
        <button onClick={() => printMutation.mutate(r.id)} className="p-1.5 hover:bg-teal-50 text-teal-600 rounded-lg"><Printer size={15} /></button>
        <button onClick={() => { if (confirm('Delete this item?')) deleteMutation.mutate(r.id) }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={15} /></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-sm text-gray-500">{data?.totalCount ?? 0} items total</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button variant="outline" size="sm" onClick={handleBatchPrint}>
              <Printer size={15} /> Print {selected.size}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleRefresh} title="Reset filters and reload" disabled={isFetching}>
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : undefined} />
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={15} /> Add Item</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name, SKU…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowImageSearch(true)} title="Search by photo">
          <Camera size={15} /> Search by Image
        </Button>
        <div className="min-w-44">
          <Combobox
            placeholder="All Categories"
            options={categories
              ?.filter(c => !c.parentCategoryId)
              .flatMap(c => [
                { value: c.id, label: c.name },
                ...(c.subCategories ?? []).map(s => ({ value: s.id, label: s.name, indent: true })),
              ]) ?? []}
            value={categoryId}
            onChange={v => { setCategoryId(v); setPage(1) }}
            allowClear
          />
        </div>
        <div className="min-w-32">
          <Combobox
            placeholder="All Metals"
            options={metals?.map(m => ({ value: m.id, label: m.name })) ?? []}
            value={metalId}
            onChange={v => { setMetalId(v); setAdvanced(p => ({ ...p, purityId: undefined })); setPage(1) }}
            allowClear
          />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-40">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Button variant={activeFilterChips.length ? 'outline' : 'ghost'} size="sm" onClick={openFilters}>
          <Filter size={14} /> Filters {activeFilterChips.length > 0 && `(${activeFilterChips.length})`}
        </Button>
      </div>

      {/* Active filter chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {activeFilterChips.map(chip => (
            <span key={chip.key} className="badge bg-amber-100 text-amber-800 flex items-center gap-1.5 pr-1.5">
              {chip.label}
              <button onClick={() => removeChip(chip.key)} className="hover:text-amber-900"><X size={11} /></button>
            </span>
          ))}
          <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-600 underline">Clear all</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <Table
          data={data?.items ?? []}
          columns={columns}
          loading={isLoading}
          onRowClick={setViewItem}
          emptyMessage="No jewellery items found"
        />
        <Pagination
          currentPage={page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
          totalCount={data?.totalCount}
          pageSize={20}
        />
      </div>

      {/* Modals */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Item" size="2xl">
        <ItemForm onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['inventory'] }) }} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Item" size="2xl">
        {editItem && (
          <ItemForm item={editItem} onSuccess={() => { setEditItem(null); qc.invalidateQueries({ queryKey: ['inventory'] }) }} />
        )}
      </Modal>

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Item Details" size="xl">
        {viewItem && <ItemDetail item={viewItem} />}
      </Modal>

      <Modal open={showImageSearch} onClose={() => setShowImageSearch(false)} title="Search by Image" size="lg">
        <ImageSearchModal onSelectItem={(it) => { setShowImageSearch(false); setViewItem(it) }} />
      </Modal>

      <Modal
        open={showFilters} onClose={() => setShowFilters(false)} title="Advanced Filters" size="md"
        footer={<>
          <Button variant="secondary" onClick={() => { setDraftAdvanced({}) }}>Reset</Button>
          <Button onClick={applyFilters}><ArrowUpDown size={14} /> Apply Filters</Button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Min Price (₹)</label>
              <input type="number" value={draftAdvanced.minPrice ?? ''} onChange={e => setDraftAdvanced(p => ({ ...p, minPrice: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Max Price (₹)</label>
              <input type="number" value={draftAdvanced.maxPrice ?? ''} onChange={e => setDraftAdvanced(p => ({ ...p, maxPrice: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Any" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Min Weight (g)</label>
              <input type="number" step="0.001" value={draftAdvanced.minWeight ?? ''} onChange={e => setDraftAdvanced(p => ({ ...p, minWeight: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Max Weight (g)</label>
              <input type="number" step="0.001" value={draftAdvanced.maxWeight ?? ''} onChange={e => setDraftAdvanced(p => ({ ...p, maxWeight: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="Any" />
            </div>
          </div>

          {selectedMetal?.purities && selectedMetal.purities.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">Purity</label>
              <select value={draftAdvanced.purityId ?? ''} onChange={e => setDraftAdvanced(p => ({ ...p, purityId: e.target.value || undefined }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">Any Purity</option>
                {selectedMetal.purities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Location</label>
              <input value={draftAdvanced.location ?? ''} onChange={e => setDraftAdvanced(p => ({ ...p, location: e.target.value || undefined }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="e.g. Showcase A" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Design</label>
              <input value={draftAdvanced.design ?? ''} onChange={e => setDraftAdvanced(p => ({ ...p, design: e.target.value || undefined }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="e.g. Antique" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Style</label>
              <input value={draftAdvanced.style ?? ''} onChange={e => setDraftAdvanced(p => ({ ...p, style: e.target.value || undefined }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="e.g. Traditional" />
            </div>
          </div>

          <div className="flex gap-5 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={!!draftAdvanced.hallmarkedOnly} onChange={e => setDraftAdvanced(p => ({ ...p, hallmarkedOnly: e.target.checked || undefined }))} className="rounded text-amber-600" />
              Hallmarked only
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={!!draftAdvanced.inStock} onChange={e => setDraftAdvanced(p => ({ ...p, inStock: e.target.checked || undefined }))} className="rounded text-amber-600" />
              In stock only
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
