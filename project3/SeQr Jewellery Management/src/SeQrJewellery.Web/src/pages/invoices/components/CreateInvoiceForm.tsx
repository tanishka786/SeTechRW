import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Plus, Trash2, ScanLine, UserPlus } from 'lucide-react'
import { invoicesApi, customersApi, tagsApi } from '../../../api'
import { Input, Select } from '../../../components/ui/Input'
import Combobox from '../../../components/ui/Combobox'
import Button from '../../../components/ui/Button'
import { InvoiceType, PaymentMethod, GenderType, CustomerType } from '../../../types'
import type { Invoice, CreateInvoiceRequest, CreateInvoiceItemRequest, CreatePaymentRequest } from '../../../types'
import { fmtCurrency } from '../../../utils/format'
import toast from 'react-hot-toast'

interface Props { onSuccess: (invoice: Invoice) => void }

interface FormData {
  invoiceType: InvoiceType; invoiceDate: string; customerId: string;
  oldGoldAmount: number; oldGoldWeight: number; isIGST: boolean; notes: string;
}

export default function CreateInvoiceForm({ onSuccess }: Props) {
  const [items, setItems] = useState<(CreateInvoiceItemRequest & {
    name?: string; price?: number; metalRate?: number; metal?: string; purity?: string
  })[]>([])
  const [payments, setPayments] = useState<CreatePaymentRequest[]>([])
  const [scanTag, setScanTag] = useState('')
  const [scanning, setScanning] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [newCustomer, setNewCustomer] = useState<{ name: string; phone: string } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(customerSearch), 300)
    return () => clearTimeout(t)
  }, [customerSearch])

  const { data: customers, isFetching: customersLoading } = useQuery({
    queryKey: ['customers-search', debouncedSearch],
    queryFn: () => customersApi.list(debouncedSearch, 1, 20),
    placeholderData: p => p,
  })

  const { register, handleSubmit, watch, setValue, control, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { invoiceType: InvoiceType.Sale, invoiceDate: new Date().toISOString().split('T')[0], oldGoldAmount: 0, oldGoldWeight: 0, isIGST: false }
  })

  const mutation = useMutation({
    mutationFn: (req: CreateInvoiceRequest) => invoicesApi.create(req),
    onSuccess,
  })

  const createCustomerMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) => {
      const [firstName, ...rest] = data.name.trim().split(/\s+/)
      return customersApi.create({
        firstName, lastName: rest.join(' ') || undefined, phone: data.phone.trim() || undefined,
        gender: GenderType.PreferNotToSay, customerType: CustomerType.Retail, creditLimit: 0,
      })
    },
    onSuccess: (c) => {
      setValue('customerId', c.id)
      setCustomerSearch(c.fullName)
      setNewCustomer(null)
      toast.success(`Customer "${c.fullName}" created`)
    },
    onError: () => toast.error('Failed to create customer'),
  })

  const customerOptions = customers?.items.map(c => ({
    value: c.id,
    label: c.fullName,
    sublabel: c.phone ?? c.email ?? '',
  })) ?? []

  const handleScan = async () => {
    if (!scanTag.trim()) return
    setScanning(true)
    try {
      const r = await tagsApi.scan(scanTag.trim())
      if (!r.jewelleryItemId) {
        toast.error('Tag is not mapped to an item yet')
      } else {
        setItems(prev => [...prev, {
          jewelleryItemId: r.jewelleryItemId!,
          tagValue: r.matchedValue,
          quantity: 1,
          name: r.name,
          price: r.sellingPrice,
          metalRate: r.metalRate,
          metal: r.metal,
          purity: r.purity,
        }])
        setScanTag('')
      }
    } catch {
      toast.error('Tag not found')
    }
    setScanning(false)
  }

  const itemTotal = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0)
  const payTotal = payments.reduce((s, p) => s + p.amount, 0)

  const onSubmit = (data: FormData) => {
    if (!items.length) { toast.error('Add at least one item'); return }
    mutation.mutate({
      ...data,
      customerId: data.customerId || undefined,
      items: items.map(({ name: _n, price: _p, metalRate: _r, metal: _m, purity: _u, ...rest }) => rest),
      payments: payments.length ? payments : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Select label="Invoice Type" options={[
          { value: InvoiceType.Sale, label: 'Sale' }, { value: InvoiceType.Purchase, label: 'Purchase' },
          { value: InvoiceType.Return, label: 'Return' },
        ]} {...register('invoiceType', { valueAsNumber: true })} />
        <Input label="Invoice Date" type="date" {...register('invoiceDate')} />
        <div className="space-y-2">
          <Controller
            name="customerId"
            control={control}
            render={({ field }) => (
              <Combobox
                label="Customer"
                placeholder="Walk-in customer — type to search…"
                options={customerOptions}
                value={field.value ?? ''}
                onChange={v => field.onChange(v)}
                onInputChange={setCustomerSearch}
                filterLocally={false}
                loading={customersLoading}
                allowClear
                onCreate={name => setNewCustomer({ name, phone: '' })}
                createLabel={name => `New customer "${name}"`}
                emptyMessage="No customers found"
              />
            )}
          />
          {newCustomer && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-900 flex items-center gap-1"><UserPlus size={13} /> Quick-create customer</p>
              <div className="flex gap-2">
                <input value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Full name" className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <input value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="Phone" className="w-32 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setNewCustomer(null)}>Cancel</Button>
                <Button type="button" size="sm" loading={createCustomerMutation.isPending}
                  onClick={() => { if (newCustomer.name.trim()) createCustomerMutation.mutate(newCustomer) }}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
        <Input label="Old Gold Amount (₹)" type="number" step="0.01" {...register('oldGoldAmount', { valueAsNumber: true })} />
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-sm text-gray-700">Items</p>
        </div>

        {/* Scan input */}
        <div className="flex gap-2 mb-3">
          <input
            value={scanTag} onChange={e => setScanTag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleScan())}
            placeholder="Scan barcode / QR / EPC to add item…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleScan} loading={scanning}><ScanLine size={15} /> Scan</Button>
        </div>

        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs font-mono text-gray-500">{item.tagValue}</p>
                  {item.metalRate != null && (
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Today’s {item.metal} {item.purity} rate {fmtCurrency(item.metalRate)}/g
                    </p>
                  )}
                </div>
                <input type="number" value={item.quantity} min={1}
                  onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, quantity: Number(e.target.value) } : it))}
                  className="w-16 px-2 py-1 border rounded text-sm text-center" />
                <span className="text-sm font-semibold w-24 text-right">{fmtCurrency((item.price ?? 0) * item.quantity)}</span>
                <button type="button" onClick={() => setItems(p => p.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-xl py-8 text-center text-gray-400 text-sm">
            Scan items or add manually
          </div>
        )}
      </div>

      {/* Payments */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-sm text-gray-700">Payments <span className="text-gray-400 font-normal">(optional)</span></p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setPayments(p => [...p, { paymentMethod: PaymentMethod.Cash, amount: itemTotal - payTotal }])}>
            <Plus size={14} /> Add Payment
          </Button>
        </div>
        {payments.map((pmt, i) => (
          <div key={i} className="space-y-2 mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex gap-2">
              <select value={pmt.paymentMethod} onChange={e => setPayments(p => p.map((pp, j) => j === i ? { ...pp, paymentMethod: Number(e.target.value) } : pp))}
                className="flex-1 px-3 py-2 border rounded-lg text-sm">
                {[PaymentMethod.Cash, PaymentMethod.Cheque, PaymentMethod.Card, PaymentMethod.UPI, PaymentMethod.BankTransfer, PaymentMethod.GoldExchange, PaymentMethod.OldJewellery]
                  .map(pm => <option key={pm} value={pm}>{['', 'Cash', 'Card', 'Bank Transfer', 'Cheque', 'Gold Exchange', 'Old Jewellery', 'UPI'][pm]}</option>)}
              </select>
              <input type="number" value={pmt.amount} step="0.01"
                onChange={e => setPayments(p => p.map((pp, j) => j === i ? { ...pp, amount: Number(e.target.value) } : pp))}
                className="w-32 px-3 py-2 border rounded-lg text-sm" placeholder="Amount" />
              <button type="button" onClick={() => setPayments(p => p.filter((_, j) => j !== i))} className="text-red-500"><Trash2 size={15} /></button>
            </div>
            {pmt.paymentMethod === PaymentMethod.Cheque && (
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Cheque number" value={pmt.chequeNumber ?? ''}
                  onChange={e => setPayments(p => p.map((pp, j) => j === i ? { ...pp, chequeNumber: e.target.value } : pp))}
                  className="px-3 py-2 border rounded-lg text-sm" />
                <input placeholder="Bank name" value={pmt.bankName ?? ''}
                  onChange={e => setPayments(p => p.map((pp, j) => j === i ? { ...pp, bankName: e.target.value } : pp))}
                  className="px-3 py-2 border rounded-lg text-sm" />
              </div>
            )}
            {pmt.paymentMethod === PaymentMethod.Cash && (
              <input placeholder="Cash receipt notes (optional)" value={pmt.notes ?? ''}
                onChange={e => setPayments(p => p.map((pp, j) => j === i ? { ...pp, notes: e.target.value } : pp))}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-amber-50 rounded-xl p-4 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">Item Total</p>
          <p className="text-xl font-bold text-amber-700">{fmtCurrency(itemTotal)}</p>
          <p className="text-[11px] text-amber-800/70 mt-1">Billed at today’s live metal rates</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Amount Paid</p>
          <p className="text-xl font-bold text-green-600">{fmtCurrency(payTotal)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Balance</p>
          <p className={`text-xl font-bold ${itemTotal - payTotal > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtCurrency(Math.max(0, itemTotal - payTotal))}</p>
        </div>
      </div>

      <Input label="Notes" placeholder="Additional notes…" {...register('notes')} />

      {mutation.isError && <p className="text-sm text-red-600">{String(mutation.error)}</p>}

      <div className="flex justify-end pt-2">
        <Button type="submit" size="lg" loading={isSubmitting || mutation.isPending}>Create Invoice</Button>
      </div>
    </form>
  )
}
