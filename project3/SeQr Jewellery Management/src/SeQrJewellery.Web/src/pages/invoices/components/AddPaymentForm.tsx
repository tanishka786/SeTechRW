import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { invoicesApi, settingsApi } from '../../../api'
import { handleApiError } from '../../../api/client'
import { Input, Select } from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import { InvoiceStatus, InvoiceType, PaymentMethod } from '../../../types'
import type { Invoice, CreatePaymentRequest } from '../../../types'
import { fmtCurrency } from '../../../utils/format'
import CashKycAlert, { DEFAULT_CASH_PAN_LIMIT, isValidPan } from '../../../components/invoices/CashKycAlert'
import toast from 'react-hot-toast'

interface Props { invoice: Invoice; onSuccess: () => void }

type PaymentFormValues = CreatePaymentRequest & { paymentDate?: string }

export default function AddPaymentForm({ invoice, onSuccess }: Props) {
  const [kycPan, setKycPan] = useState('')
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<PaymentFormValues>({
    defaultValues: {
      paymentMethod: PaymentMethod.Cash,
      amount: invoice.balanceAmount,
      paymentDate: new Date().toISOString().split('T')[0],
      statusOverride: undefined,
    },
  })

  const method = useWatch({ control, name: 'paymentMethod' })
  const amount = useWatch({ control, name: 'amount' })

  const { data: invoiceSettings } = useQuery({ queryKey: ['invoice-settings'], queryFn: settingsApi.getInvoiceSettings })
  const cashLimit = invoiceSettings?.cashPanLimit && invoiceSettings.cashPanLimit > 0
    ? invoiceSettings.cashPanLimit
    : DEFAULT_CASH_PAN_LIMIT
  const { data: cashKyc } = useQuery({
    queryKey: ['cash-kyc', invoice.customerId],
    queryFn: () => invoicesApi.cashKyc(invoice.customerId),
    enabled: invoice.invoiceType === InvoiceType.Sale,
  })

  const mutation = useMutation({
    mutationFn: (req: CreatePaymentRequest) => invoicesApi.addPayment(invoice.id, req),
    onSuccess,
    onError: (err) => toast.error(handleApiError(err)),
  })

  const paymentOptions = [
    { value: PaymentMethod.Cash, label: 'Cash' },
    { value: PaymentMethod.Cheque, label: 'Cheque' },
    { value: PaymentMethod.Card, label: 'Card' },
    { value: PaymentMethod.UPI, label: 'UPI' },
    { value: PaymentMethod.BankTransfer, label: 'Bank Transfer' },
    { value: PaymentMethod.GoldExchange, label: 'Gold Exchange' },
    { value: PaymentMethod.OldJewellery, label: 'Old Jewellery' },
  ]

  const statusOptions = [
    { value: '', label: 'Auto (based on amount)' },
    { value: InvoiceStatus.PartiallyPaid, label: 'Mark Partially Paid' },
    { value: InvoiceStatus.Paid, label: 'Mark Fully Paid' },
    { value: InvoiceStatus.Confirmed, label: 'Keep Confirmed' },
  ]

  const onSubmit = (data: PaymentFormValues) => {
    const isCash = Number(data.paymentMethod) === PaymentMethod.Cash
    const cashAmount = isCash ? Number(data.amount) || 0 : 0
    const todayCash = cashKyc?.todayCashReceived ?? 0
    const storedPan = invoice.customerPan || cashKyc?.customerPan

    if (invoice.invoiceType === InvoiceType.Sale && cashAmount + todayCash >= cashLimit) {
      if (!invoice.customerId) { toast.error('This invoice is walk-in. Add a customer with PAN before taking this cash.'); return }
      if (!isValidPan(storedPan) && !isValidPan(kycPan)) { toast.error('Enter customer PAN before taking this cash'); return }
    }

    const statusOverride = data.statusOverride === undefined || data.statusOverride === null || (data.statusOverride as unknown as string) === ''
      ? undefined
      : Number(data.statusOverride) as InvoiceStatus

    mutation.mutate({
      paymentMethod: Number(data.paymentMethod) as PaymentMethod,
      amount: Number(data.amount),
      paymentDate: data.paymentDate ? new Date(data.paymentDate).toISOString() : undefined,
      transactionReference: data.transactionReference || undefined,
      chequeNumber: data.chequeNumber || undefined,
      bankName: data.bankName || undefined,
      cardLast4: data.cardLast4 || undefined,
      upiTransactionId: data.upiTransactionId || undefined,
      notes: data.notes || undefined,
      statusOverride,
      customerPan: kycPan || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="bg-amber-50 rounded-lg p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Invoice Total</span>
          <span className="font-semibold">{fmtCurrency(invoice.totalAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Already Paid</span>
          <span className="font-semibold text-green-600">{fmtCurrency(invoice.paidAmount)}</span>
        </div>
        <div className="flex justify-between font-bold text-red-600 pt-1 border-t border-amber-200 mt-1">
          <span>Balance Due</span>
          <span>{fmtCurrency(invoice.balanceAmount)}</span>
        </div>
      </div>

      <Select label="Payment Method" options={paymentOptions} {...register('paymentMethod', { valueAsNumber: true })} />
      <Input label="Amount (₹)" type="number" step="0.01" {...register('amount', { required: 'Required', valueAsNumber: true })} />
      <Input label="Payment Date" type="date" {...register('paymentDate')} />

      {Number(method) === PaymentMethod.Cash && (
        <Input label="Receipt / Notes" placeholder="Cash received by…" {...register('notes')} />
      )}

      {invoice.invoiceType === InvoiceType.Sale && Number(method) === PaymentMethod.Cash && (
        <CashKycAlert
          cashOnThisBill={Number(amount) || 0}
          todayCashElsewhere={cashKyc?.todayCashReceived ?? 0}
          limit={cashLimit}
          customerId={invoice.customerId}
          storedPan={invoice.customerPan || cashKyc?.customerPan}
          capturedPan={kycPan}
          onPanChange={setKycPan}
        />
      )}

      {Number(method) === PaymentMethod.Cheque && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Cheque Number *" {...register('chequeNumber', { required: Number(method) === PaymentMethod.Cheque })} />
          <Input label="Bank Name" {...register('bankName')} />
          <Input label="Transaction Reference" className="col-span-2" {...register('transactionReference')} />
          <Input label="Notes" className="col-span-2" {...register('notes')} />
        </div>
      )}

      {Number(method) === PaymentMethod.Card && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Card Last 4" maxLength={4} {...register('cardLast4')} />
          <Input label="Auth / Ref No." {...register('transactionReference')} />
        </div>
      )}

      {Number(method) === PaymentMethod.UPI && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="UPI Transaction ID" {...register('upiTransactionId')} />
          <Input label="Reference" {...register('transactionReference')} />
        </div>
      )}

      {Number(method) === PaymentMethod.BankTransfer && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Bank Name" {...register('bankName')} />
          <Input label="UTR / Reference" {...register('transactionReference')} />
        </div>
      )}

      {![PaymentMethod.Cash, PaymentMethod.Cheque, PaymentMethod.Card, PaymentMethod.UPI, PaymentMethod.BankTransfer].includes(Number(method)) && (
        <Input label="Reference / Notes" {...register('transactionReference')} />
      )}

      <Select
        label="Update Invoice Status"
        options={statusOptions}
        {...register('statusOverride')}
      />
      <p className="text-xs text-gray-400 -mt-2">Choose Cash or Cheque for in-person settlement, then set status if needed.</p>

      {mutation.isError && <p className="text-sm text-red-600">{String(mutation.error)}</p>}

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting || mutation.isPending}>Record Payment</Button>
      </div>
    </form>
  )
}
