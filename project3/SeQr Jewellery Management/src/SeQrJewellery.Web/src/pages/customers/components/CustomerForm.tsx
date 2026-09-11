import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { customersApi } from '../../../api'
import { Input, Select, TextArea } from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import { CustomerType, GenderType } from '../../../types'
import type { Customer, CreateCustomerRequest } from '../../../types'

interface Props { customer?: Customer; onSuccess: () => void }

export default function CustomerForm({ customer, onSuccess }: Props) {
  const isEdit = !!customer
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateCustomerRequest>({
    defaultValues: customer ? {
      firstName: customer.firstName, lastName: customer.lastName, email: customer.email,
      phone: customer.phone, alternatePhone: customer.alternatePhone,
      dateOfBirth: customer.dateOfBirth?.split('T')[0], anniversary: customer.anniversary?.split('T')[0],
      gender: customer.gender, customerType: customer.customerType,
      pan: customer.pan, gst: customer.gst, creditLimit: customer.creditLimit,
      address: customer.address, city: customer.city, state: customer.state, country: customer.country ?? 'India',
    } : { gender: GenderType.Female, customerType: CustomerType.Retail, creditLimit: 0, country: 'India' }
  })

  const mutation = useMutation({
    mutationFn: (data: CreateCustomerRequest) =>
      isEdit ? customersApi.update(customer!.id, data) : customersApi.create(data),
    onSuccess,
  })

  const genderOptions = [
    { value: GenderType.Female, label: 'Female' }, { value: GenderType.Male, label: 'Male' },
    { value: GenderType.Other, label: 'Other' }, { value: GenderType.PreferNotToSay, label: 'Prefer Not to Say' },
  ]
  const typeOptions = [
    { value: CustomerType.Retail, label: 'Retail' }, { value: CustomerType.Wholesale, label: 'Wholesale' },
    { value: CustomerType.Corporate, label: 'Corporate' }, { value: CustomerType.VIP, label: 'VIP' },
  ]

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="First Name *" {...register('firstName', { required: 'Required' })} error={errors.firstName?.message} />
        <Input label="Last Name" {...register('lastName')} />
        <Input label="Phone" type="tel" {...register('phone')} />
        <Input label="Alternate Phone" type="tel" {...register('alternatePhone')} />
        <Input label="Email" type="email" {...register('email')} />
        <Select label="Gender" options={genderOptions} {...register('gender', { valueAsNumber: true })} />
        <Select label="Customer Type" options={typeOptions} {...register('customerType', { valueAsNumber: true })} />
        <Input label="Credit Limit (₹)" type="number" step="0.01" {...register('creditLimit', { valueAsNumber: true })} />
        <Input label="Date of Birth" type="date" {...register('dateOfBirth')} />
        <Input label="Anniversary" type="date" {...register('anniversary')} />
        <Input label="PAN" placeholder="ABCDE1234F" {...register('pan')} />
        <Input label="GST Number" {...register('gst')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextArea label="Address" {...register('address')} className="col-span-2" />
        <Input label="City" {...register('city')} />
        <Input label="State" {...register('state')} />
        <Input label="Country" {...register('country')} />
        <Input label="Postal Code" {...register('postalCode')} />
      </div>

      {mutation.isError && <p className="text-sm text-red-600">{String(mutation.error)}</p>}

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isSubmitting || mutation.isPending}>
          {isEdit ? 'Update Customer' : 'Create Customer'}
        </Button>
      </div>
    </form>
  )
}
