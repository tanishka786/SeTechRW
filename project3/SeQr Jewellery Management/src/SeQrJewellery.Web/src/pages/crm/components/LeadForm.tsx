import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { crmApi, usersApi } from '../../../api'
import { Input, Select, TextArea } from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import { LeadSource } from '../../../types'
import type { CreateLeadRequest } from '../../../types'
import { leadSourceLabel } from '../../../utils/format'
import { useAuthStore } from '../../../store/authStore'

interface Props { onSuccess: () => void }

export default function LeadForm({ onSuccess }: Props) {
  const canViewAll = useAuthStore(s => s.canViewAllLeads())
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    enabled: canViewAll,
  })

  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<CreateLeadRequest>({
    defaultValues: { source: LeadSource.WalkIn }
  })

  const mutation = useMutation({
    mutationFn: (req: CreateLeadRequest) => {
      const payload = {
        ...req,
        nextFollowUpDate: req.nextFollowUpDate
          ? new Date(req.nextFollowUpDate).toISOString()
          : undefined,
        assignedToUserId: canViewAll && req.assignedToUserId ? req.assignedToUserId : undefined,
      }
      return crmApi.create(payload)
    },
    onSuccess,
  })

  const sourceOptions = Object.entries(leadSourceLabel).map(([v, l]) => ({ value: Number(v), label: l }))
  const userOptions = [
    { value: '', label: 'Assign to me' },
    ...(users?.filter(u => u.isActive).map(u => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName} (${u.username})`,
    })) ?? []),
  ]

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="First Name *" {...register('firstName', { required: 'Required' })} error={errors.firstName?.message} />
        <Input label="Last Name" {...register('lastName')} />
        <Input label="Phone" {...register('phone')} />
        <Input label="Email" type="email" {...register('email')} />
        <Select label="Source" options={sourceOptions} {...register('source', { valueAsNumber: true })} />
        <Input label="Budget (₹)" type="number" step="0.01" {...register('budget', { valueAsNumber: true })} />
      </div>
      <Input label="Interested In" placeholder="e.g. Gold necklace, diamond ring…" {...register('interestedIn')} />
      <Input label="Occasion" placeholder="e.g. Wedding, Anniversary…" {...register('occasion')} />
      {canViewAll && (
        <Select label="Assign To" options={userOptions} {...register('assignedToUserId')} />
      )}
      {!canViewAll && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-md px-3 py-2">
          This lead will be assigned to you. Only you (and sales admins) will be able to see it.
        </p>
      )}
      <Input label="Next Follow-up Date" type="date" {...register('nextFollowUpDate')} />
      <TextArea label="Initial Notes" {...register('notes')} />

      {mutation.isError && <p className="text-sm text-red-600">{String(mutation.error)}</p>}

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting || mutation.isPending}>Create Lead</Button>
      </div>
    </form>
  )
}
