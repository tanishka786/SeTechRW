import { useEffect, useState } from 'react'
import { Download, CreditCard, Link as LinkIcon, Banknote, AlertTriangle, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMutation, useQuery } from '@tanstack/react-query'
import { fmtCurrency, fmtDate, fmtDateTime, fmtWeight, invoiceStatusLabel, invoiceStatusColor, invoiceTypeLabel, paymentMethodLabel } from '../../../utils/format'
import { InvoiceStatus, PaymentMethod } from '../../../types'
import type { Invoice } from '../../../types'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import { Select } from '../../../components/ui/Input'
import { invoicesApi, paymentsApi, settingsApi } from '../../../api'
import { DEFAULT_CASH_PAN_LIMIT, isValidPan } from '../../../components/invoices/CashKycAlert'
import AddPaymentForm from './AddPaymentForm'

declare global {
  interface Window { Razorpay: new (options: Record<string, unknown>) => { open: () => void } }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function paymentDetail(p: Invoice['payments'][number]): string {
  const parts: string[] = []
  if (p.paymentMethod === PaymentMethod.Cheque && p.chequeNumber) parts.push(`Chq ${p.chequeNumber}`)
  if (p.bankName) parts.push(p.bankName)
  if (p.cardLast4) parts.push(`****${p.cardLast4}`)
  if (p.upiTransactionId) parts.push(p.upiTransactionId)
  if (p.transactionReference) parts.push(p.transactionReference)
  if (p.notes) parts.push(p.notes)
  return parts.join(' · ')
}

export default function InvoiceDetail({ invoice, onPaid }: { invoice: Invoice; onPaid?: () => void }) {
  const [downloading, setDownloading] = useState(false)
  const [payingWithRazorpay, setPayingWithRazorpay] = useState(false)
  const [creatingLink, setCreatingLink] = useState(false)
  const [showCashPay, setShowCashPay] = useState(false)
  const [statusValue, setStatusValue] = useState<string>(String(invoice.status))
  useEffect(() => { setStatusValue(String(invoice.status)) }, [invoice.status])

  const statusMutation = useMutation({
    mutationFn: (status: InvoiceStatus) => invoicesApi.updateInvoiceStatus(invoice.id, { status }),
    onSuccess: () => { toast.success('Status updated'); onPaid?.() },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Failed to update status'),
  })

  const { data: invoiceSettings } = useQuery({ queryKey: ['invoice-settings'], queryFn: settingsApi.getInvoiceSettings })
  const cashLimit = invoiceSettings?.cashPanLimit && invoiceSettings.cashPanLimit > 0
    ? invoiceSettings.cashPanLimit
    : DEFAULT_CASH_PAN_LIMIT
  const cashOnInvoice = (invoice.payments ?? [])
    .filter(p => p.paymentMethod === PaymentMethod.Cash && !p.isRefunded)
    .reduce((s, p) => s + p.amount, 0)

  const handleDownloadPdf = async () => {
    setDownloading(true)
    try { await invoicesApi.downloadPdf(invoice.id, invoice.invoiceNumber) }
    catch { toast.error('Failed to download PDF') }
    finally { setDownloading(false) }
  }

  const handleCollectPayment = async () => {
    setPayingWithRazorpay(true)
    try {
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) { toast.error('Could not load Razorpay checkout'); return }

      const order = await paymentsApi.createOrder(invoice.id)
      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amountInPaise,
        currency: order.currency,
        name: 'SeQr Jewellery',
        description: `Payment for invoice ${order.invoiceNumber}`,
        order_id: order.orderId,
        prefill: { name: order.customerName, contact: order.customerPhone, email: order.customerEmail },
        theme: { color: '#d97706' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await paymentsApi.verify({
              invoiceId: invoice.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            toast.success('Payment received successfully')
            onPaid?.()
          } catch {
            toast.error('Payment verification failed')
          }
        },
      })
      razorpay.open()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start payment')
    } finally {
      setPayingWithRazorpay(false)
    }
  }

  const handleCreatePaymentLink = async () => {
    setCreatingLink(true)
    try {
      const link = await paymentsApi.createPaymentLink(invoice.id)
      await navigator.clipboard.writeText(link.shortUrl)
      toast.success('Payment link copied to clipboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create payment link')
    } finally {
      setCreatingLink(false)
    }
  }

  const canPay = invoice.status !== InvoiceStatus.Paid && invoice.status !== InvoiceStatus.Cancelled && invoice.balanceAmount > 0

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500">Invoice Number</p>
          <p className="text-xl font-bold font-mono text-gray-900">{invoice.invoiceNumber}</p>
          <div className="flex gap-2 mt-2">
            <Badge label={invoiceTypeLabel[invoice.invoiceType]} colorClass="bg-blue-50 text-blue-700" />
            <Badge label={invoiceStatusLabel[invoice.status]} colorClass={invoiceStatusColor[invoice.status]} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Date</p>
          <p className="font-medium">{fmtDate(invoice.invoiceDate)}</p>
          {invoice.dueDate && <p className="text-xs text-gray-400">Due: {fmtDate(invoice.dueDate)}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={handleDownloadPdf} loading={downloading}><Download size={14} /> Download PDF</Button>
        {canPay && (
          <>
            <Button size="sm" onClick={() => setShowCashPay(true)}><Banknote size={14} /> Cash / Cheque</Button>
            <Button variant="outline" size="sm" onClick={handleCollectPayment} loading={payingWithRazorpay}><CreditCard size={14} /> Collect Online</Button>
            <Button variant="ghost" size="sm" onClick={handleCreatePaymentLink} loading={creatingLink}><LinkIcon size={14} /> Copy Payment Link</Button>
          </>
        )}
      </div>

      {cashOnInvoice >= cashLimit && (
        <div className={`rounded-xl border px-3 py-2.5 flex items-start gap-2 text-sm ${isValidPan(invoice.customerPan) ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {isValidPan(invoice.customerPan)
            ? <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
          <p>
            Cash of {fmtCurrency(cashOnInvoice)} is at or above the {fmtCurrency(cashLimit)} KYC limit (s.269ST).
            {isValidPan(invoice.customerPan)
              ? <> PAN on file: <span className="font-mono font-semibold">{invoice.customerPan}</span>.</>
              : ' Customer PAN is missing — update the customer record.'}
          </p>
        </div>
      )}

      {invoice.status !== InvoiceStatus.Cancelled && (
        <div className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex-1 min-w-40">
            <Select
              label="Invoice Status"
              value={statusValue}
              onChange={e => setStatusValue(e.target.value)}
              options={[
                { value: InvoiceStatus.Confirmed, label: 'Confirmed' },
                { value: InvoiceStatus.PartiallyPaid, label: 'Partially Paid' },
                { value: InvoiceStatus.Paid, label: 'Paid' },
                { value: InvoiceStatus.Cancelled, label: 'Cancelled' },
              ]}
            />
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={Number(statusValue) === invoice.status}
            loading={statusMutation.isPending}
            onClick={() => statusMutation.mutate(Number(statusValue) as InvoiceStatus)}
          >
            Update Status
          </Button>
        </div>
      )}

      {invoice.customerName && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Customer</p>
          <p className="font-medium text-gray-900">{invoice.customerName}</p>
          {invoice.customerPhone && <p className="text-sm text-gray-500">{invoice.customerPhone}</p>}
        </div>
      )}

      <div>
        <p className="font-semibold text-gray-700 text-sm mb-2">Items</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="table-th">Item</th>
              <th className="table-th">Qty</th>
              <th className="table-th">Weight</th>
              <th className="table-th text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items?.map(item => (
              <tr key={item.id}>
                <td className="table-td">
                  <p className="font-medium">{item.itemName}</p>
                  {item.tagValue && <p className="font-mono text-xs text-gray-400">{item.tagValue}</p>}
                  {item.metalRate > 0 && (
                    <p className="text-[11px] text-amber-700">Rate {fmtCurrency(item.metalRate)}/g</p>
                  )}
                </td>
                <td className="table-td">{item.quantity}</td>
                <td className="table-td">{item.grossWeight.toFixed(3)}g</td>
                <td className="table-td text-right font-medium">{fmtCurrency(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(invoice.oldGoldItems?.length || invoice.oldGoldAmount > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
          <p className="font-semibold text-gray-800 text-sm">Old gold exchange voucher</p>
          {invoice.oldGoldItems && invoice.oldGoldItems.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="table-th text-left">Piece</th>
                  <th className="table-th">Gross</th>
                  <th className="table-th">Purity</th>
                  <th className="table-th">Melt</th>
                  <th className="table-th">Rate</th>
                  <th className="table-th">Payable</th>
                  <th className="table-th text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {invoice.oldGoldItems.map(og => {
                  const purity = (og.xrfPurityPercent ?? 0) > 0 ? og.xrfPurityPercent! : og.purityPercent
                  return (
                    <tr key={og.id}>
                      <td className="table-td">
                        <p className="font-medium">{og.description || 'Old gold'}</p>
                        <p className="text-[11px] text-gray-500">Fine {fmtWeight(og.fineWeight)}</p>
                      </td>
                      <td className="table-td">{fmtWeight(og.grossWeight)}</td>
                      <td className="table-td">
                        {purity.toFixed(2)}%
                        {og.xrfPurityPercent ? <span className="block text-[11px] text-gray-400">XRF</span> : null}
                      </td>
                      <td className="table-td">{og.meltingLossPercent.toFixed(1)}%</td>
                      <td className="table-td">{fmtCurrency(og.buyingRatePerGram)}/g</td>
                      <td className="table-td">{fmtWeight(og.payableWeight)}</td>
                      <td className="table-td text-right font-medium text-green-700">{fmtCurrency(og.creditAmount)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-600">
              {fmtWeight(invoice.oldGoldWeight ?? 0)} credited at {fmtCurrency(invoice.oldGoldAmount)}
            </p>
          )}
        </div>
      )}

      <div className="bg-amber-50 rounded-xl p-4 space-y-2">
        {[
          ['Subtotal', invoice.subTotal], ['Discount', -invoice.totalDiscount],
          ['CGST', invoice.cgst], ['SGST', invoice.sgst], ['IGST', invoice.igst],
        ].map(([l, v]) => Number(v) !== 0 && (
          <div key={String(l)} className="flex justify-between text-sm">
            <span className="text-gray-600">{l}</span>
            <span className={`font-medium ${Number(v) < 0 ? 'text-green-600' : 'text-gray-800'}`}>{fmtCurrency(Math.abs(Number(v)))}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-base pt-2 border-t border-amber-200">
          <span>Invoice Total</span>
          <span className="text-amber-700">{fmtCurrency(invoice.totalAmount)}</span>
        </div>
        {invoice.oldGoldAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Old gold credit{invoice.oldGoldWeight ? ` (${fmtWeight(invoice.oldGoldWeight)})` : ''}</span>
            <span className="font-medium text-green-700">− {fmtCurrency(invoice.oldGoldAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Paid (incl. old gold)</span>
          <span className="text-green-600 font-medium">{fmtCurrency(invoice.paidAmount)}</span>
        </div>
        {invoice.balanceAmount > 0 && (
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-red-600">Balance Due</span>
            <span className="text-red-600">{fmtCurrency(invoice.balanceAmount)}</span>
          </div>
        )}
      </div>

      {invoice.payments?.length > 0 && (
        <div>
          <p className="font-semibold text-gray-700 text-sm mb-2">Payments</p>
          <div className="space-y-2">
            {invoice.payments.map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg text-sm">
                <div>
                  <p className="font-medium text-gray-800">{paymentMethodLabel[p.paymentMethod]}</p>
                  <p className="text-xs text-gray-500">
                    {fmtDateTime(p.paymentDate)}
                    {paymentDetail(p) && ` · ${paymentDetail(p)}`}
                  </p>
                </div>
                <span className="font-bold text-green-700">{fmtCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoice.notes && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-1">Notes</p>
          <p>{invoice.notes}</p>
        </div>
      )}

      <Modal open={showCashPay} onClose={() => setShowCashPay(false)} title="Record Cash / Cheque Payment" size="md">
        <AddPaymentForm
          invoice={invoice}
          onSuccess={() => {
            setShowCashPay(false)
            toast.success('Payment recorded')
            onPaid?.()
          }}
        />
      </Modal>
    </div>
  )
}
