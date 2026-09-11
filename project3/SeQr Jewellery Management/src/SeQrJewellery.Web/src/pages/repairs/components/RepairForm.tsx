import { useForm, useFieldArray } from 'react-hook-form'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { repairsApi, customersApi } from '../../../api'
import { Input, Select, TextArea } from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import type { CreateRepairRequest } from '../../../types'

interface Props { onSuccess: () => void }

interface FormData extends CreateRepairRequest {
  repairItems: { description: string; estimatedCost: number }[]
}

export default function RepairForm({ onSuccess }: Props) {
  const { data: customers } = useQuery({ queryKey: ['customers-all'], queryFn: () => customersApi.list('', 1, 200) })

  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      estimatedCost: 0, advanceAmount: 0,
      repairItems: [{ description: '', estimatedCost: 0 }]
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'repairItems' })

  const mutation = useMutation({ mutationFn: repairsApi.create, onSuccess })

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <Select
        label="Customer *"
        options={[{ value: '', label: '-- Select Customer --' }, ...(customers?.items.map(c => ({ value: c.id, label: `${c.fullName} (${c.phone ?? ''})` })) ?? [])]}
        {...register('customerId', { required: 'Required' })}
      />

      <TextArea label="Item Description *" placeholder="Describe the jewellery item in detail…" {...register('itemDescription', { required: 'Required' })} />

      <div className="grid grid-cols-3 gap-3">
        <Input label="Metal Type" placeholder="Gold, Silver…" {...register('metalType')} />
        <Input label="Purity" placeholder="22K, 925…" {...register('purity')} />
        <Input label="Weight (g)" type="number" step="0.001" {...register('itemWeight', { valueAsNumber: true })} />
      </div>

      <TextArea label="Customer Instructions" placeholder="What needs to be done…" {...register('customerInstructions')} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Estimated Completion" type="date" {...register('estimatedCompletionDate')} />
        <Input label="Condition" placeholder="Good, Fair, Poor" {...register('condition')} />
        <Input label="Estimated Cost (₹)" type="number" step="0.01" {...register('estimatedCost', { valueAsNumber: true })} />
        <Input label="Advance Amount (₹)" type="number" step="0.01" {...register('advanceAmount', { valueAsNumber: true })} />
      </div>

      {/* Repair Tasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-sm text-gray-700">Repair Tasks</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => append({ description: '', estimatedCost: 0 })}>
            <Plus size={14} /> Add Task
          </Button>
        </div>
        {fields.map((f, i) => (
          <div key={f.id} className="flex gap-2 mb-2">
            <input {...register(`repairItems.${i}.description`)} placeholder="Task description"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <input type="number" step="0.01" {...register(`repairItems.${i}.estimatedCost`, { valueAsNumber: true })}
              placeholder="Cost"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <button type="button" onClick={() => remove(i)} className="text-red-500 px-1"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {mutation.isError && <p className="text-sm text-red-600">{String(mutation.error)}</p>}

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isSubmitting || mutation.isPending}>Create Repair Order</Button>
      </div>
    </form>
  )
}
