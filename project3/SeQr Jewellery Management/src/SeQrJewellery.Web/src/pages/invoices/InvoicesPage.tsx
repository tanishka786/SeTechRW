import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Eye, XCircle, CreditCard, Download } from 'lucide-react'
import { invoicesApi } from '../../api'
import { fmtCurrency, fmtDate, invoiceStatusColor, invoiceStatusLabel, invoiceTypeLabel } from '../../utils/format'
import { InvoiceStatus, InvoiceType, PaymentMethod } from '../../types'
import type { Invoice } from '../../types'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import InvoiceDetail from './components/InvoiceDetail'
import CreateInvoiceForm from './components/CreateInvoiceForm'
import AddPaymentForm from './components/AddPaymentForm'
import toast from 'react-hot-toast'

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('new')) {
      setShowCreate(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, statusFilter, typeFilter, page],
    queryFn: () => invoicesApi.list({
      searchTerm: search || undefined,
      status: statusFilter ? Number(statusFilter) as InvoiceStatus : undefined,
      invoiceType: typeFilter ? Number(typeFilter) as InvoiceType : undefined,
      pageNumber: page, pageSize: 20,
    }),
    placeholderData: p => p,
  })

  const cancelMutation = useMutation({
    mutationFn: invoicesApi.cancel,
    onSuccess: () => { toast.success('Invoice cancelled'); qc.invalidateQueries({ queryKey: ['invoices'] }) },
  })

  const [exporting, setExporting] = useState(false)
  const handleExport = async () => {
    setExporting(true)
    try {
      await invoicesApi.export({
        searchTerm: search || undefined,
        status: statusFilter ? Number(statusFilter) as InvoiceStatus : undefined,
        invoiceType: typeFilter ? Number(typeFilter) as InvoiceType : undefined,
      })
      toast.success('Export downloaded')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  const columns = [
    { key: 'invoiceNumber', header: 'Invoice #', render: (r: Invoice) => <span className="font-mono text-sm font-medium">{r.invoiceNumber}</span> },
    { key: 'type', header: 'Type', render: (r: Invoice) => <Badge label={invoiceTypeLabel[r.invoiceType]} colorClass="bg-blue-50 text-blue-700" /> },
    { key: 'customer', header: 'Customer', render: (r: Invoice) => <span>{r.customerName ?? 'Walk-in'}</span> },
    { key: 'invoiceDate', header: 'Date', render: (r: Invoice) => fmtDate(r.invoiceDate) },
    { key: 'totalAmount', header: 'Total', render: (r: Invoice) => <span className="font-semibold">{fmtCurrency(r.totalAmount)}</span> },
    { key: 'paidAmount', header: 'Paid', render: (r: Invoice) => <span className={r.paidAmount < r.totalAmount ? 'text-amber-600' : 'text-green-600'}>{fmtCurrency(r.paidAmount)}</span> },
    { key: 'status', header: 'Status', render: (r: Invoice) => <Badge label={invoiceStatusLabel[r.status]} colorClass={invoiceStatusColor[r.status]} /> },
    {
      key: 'actions', header: '',
      render: (r: Invoice) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => setViewInvoice(r)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><Eye size={15} /></button>
          {r.status !== InvoiceStatus.Paid && r.status !== InvoiceStatus.Cancelled && (
            <button onClick={() => setPayInvoice(r)} className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg"><CreditCard size={15} /></button>
          )}
          {r.status !== InvoiceStatus.Cancelled && (
            <button onClick={() => { if (confirm('Cancel this invoice?')) cancelMutation.mutate(r.id) }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><XCircle size={15} /></button>
          )}
        </div>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="text-sm text-gray-500">{data?.totalCount ?? 0} total invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting}><Download size={15} /> Export</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={15} /> New Invoice</Button>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Invoice #, customer…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">All Types</option>
          {Object.entries(invoiceTypeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">All Statuses</option>
          {Object.entries(invoiceStatusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <Table data={data?.items ?? []} columns={columns} loading={isLoading} onRowClick={setViewInvoice} emptyMessage="No invoices found" />
        <Pagination currentPage={page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} totalCount={data?.totalCount} pageSize={20} />
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Invoice" size="2xl">
        <CreateInvoiceForm onSuccess={(inv) => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['invoices'] }); setViewInvoice(inv); toast.success(`Invoice ${inv.invoiceNumber} created`) }} />
      </Modal>

      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice?.invoiceNumber ?? ''}`} size="xl">
        {viewInvoice && (
          <InvoiceDetail
            invoice={viewInvoice}
            onPaid={async () => {
              qc.invalidateQueries({ queryKey: ['invoices'] })
              try {
                const updated = await invoicesApi.getById(viewInvoice.id)
                setViewInvoice(updated)
              } catch { /* keep current view */ }
            }}
          />
        )}
      </Modal>

      <Modal open={!!payInvoice} onClose={() => setPayInvoice(null)} title="Add Payment" size="md">
        {payInvoice && (
          <AddPaymentForm
            invoice={payInvoice}
            onSuccess={() => { setPayInvoice(null); qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Payment recorded') }}
          />
        )}
      </Modal>
    </div>
  )
}
