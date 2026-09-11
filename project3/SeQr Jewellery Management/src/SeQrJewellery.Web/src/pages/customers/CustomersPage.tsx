import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Eye, Edit, Star, Download } from 'lucide-react'
import { customersApi } from '../../api'
import { fmtCurrency, fmtDate, customerTypeLabel, customerTypeColor } from '../../utils/format'
import { CustomerType, GenderType } from '../../types'
import type { Customer } from '../../types'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import CustomerForm from './components/CustomerForm'
import CustomerDetail from './components/CustomerDetail'
import toast from 'react-hot-toast'

export default function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => customersApi.list(search, page, 20),
    placeholderData: p => p,
  })

  const [exporting, setExporting] = useState(false)
  const handleExport = async () => {
    setExporting(true)
    try { await customersApi.export(search || undefined); toast.success('Export downloaded') }
    catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const columns = [
    { key: 'code', header: 'Code', render: (r: Customer) => <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.customerCode}</span> },
    { key: 'name', header: 'Customer', render: (r: Customer) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xs font-bold">
          {r.firstName[0]}{r.lastName?.[0]}
        </div>
        <div>
          <p className="font-medium text-gray-900">{r.fullName}</p>
          <p className="text-xs text-gray-400">{r.phone ?? r.email ?? '—'}</p>
        </div>
      </div>
    )},
    { key: 'type', header: 'Type', render: (r: Customer) => (
      <div className="flex items-center gap-1">
        <Badge label={customerTypeLabel[r.customerType]} colorClass={customerTypeColor[r.customerType]} />
        {r.customerType === CustomerType.VIP && <Star size={12} className="text-amber-500 fill-amber-500" />}
      </div>
    )},
    { key: 'purchases', header: 'Purchases', render: (r: Customer) => (
      <div>
        <p className="font-semibold">{fmtCurrency(r.totalPurchaseAmount)}</p>
        <p className="text-xs text-gray-400">{r.totalPurchaseCount} orders</p>
      </div>
    )},
    { key: 'loyaltyPoints', header: 'Points', render: (r: Customer) => <span className="font-medium text-amber-600">{r.loyaltyPoints.toLocaleString()}</span> },
    { key: 'lastPurchase', header: 'Last Purchase', render: (r: Customer) => fmtDate(r.lastPurchaseDate) },
    {
      key: 'actions', header: '',
      render: (r: Customer) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => setViewCustomer(r)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Eye size={15} /></button>
          <button onClick={() => setEditCustomer(r)} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg"><Edit size={15} /></button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-sm text-gray-500">{data?.totalCount ?? 0} customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting}><Download size={15} /> Export</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={15} /> Add Customer</Button>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name, phone, email…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <Table data={data?.items ?? []} columns={columns} loading={isLoading} onRowClick={setViewCustomer} emptyMessage="No customers found" />
        <Pagination currentPage={page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} totalCount={data?.totalCount} pageSize={20} />
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Customer" size="lg">
        <CustomerForm onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer created') }} />
      </Modal>

      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title="Edit Customer" size="lg">
        {editCustomer && <CustomerForm customer={editCustomer} onSuccess={() => { setEditCustomer(null); qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer updated') }} />}
      </Modal>

      <Modal open={!!viewCustomer} onClose={() => setViewCustomer(null)} title={viewCustomer?.fullName ?? 'Customer'} size="xl">
        {viewCustomer && <CustomerDetail customer={viewCustomer} />}
      </Modal>
    </div>
  )
}
