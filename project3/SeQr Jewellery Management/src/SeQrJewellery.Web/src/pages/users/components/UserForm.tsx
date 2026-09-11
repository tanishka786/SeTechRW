import { useForm } from 'react-hook-form'
import { useQuery, useMutation } from '@tanstack/react-query'
import { usersApi, rolesApi } from '../../../api'
import { Input, Select } from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import { UserRole } from '../../../types'
import type { TenantUserAccount, CreateTenantUserRequest, UpdateTenantUserRequest } from '../../../types'

interface Props { user?: TenantUserAccount; onSuccess: () => void }

const userRoleOptions = [
  { value: UserRole.TenantAdmin, label: 'Tenant Admin' },
  { value: UserRole.Manager, label: 'Manager' },
  { value: UserRole.Staff, label: 'Staff' },
]

export default function UserForm({ user, onSuccess }: Props) {
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list })

  const { register, handleSubmit, watch, setValue, formState: { isSubmitting, errors } } = useForm<CreateTenantUserRequest>({
    defaultValues: user ? {
      username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName,
      phone: user.phone, role: user.role, roleIds: user.roleIds,
    } : { role: UserRole.Staff, roleIds: [] }
  })

  const selectedRoleIds = watch('roleIds') ?? []

  const toggleRole = (roleId: string) => {
    const next = selectedRoleIds.includes(roleId) ? selectedRoleIds.filter(r => r !== roleId) : [...selectedRoleIds, roleId]
    setValue('roleIds', next)
  }

  const mutation = useMutation({
    mutationFn: (req: CreateTenantUserRequest) =>
      user ? usersApi.update(user.id, req as UpdateTenantUserRequest) : usersApi.create(req),
    onSuccess,
  })

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Username *" disabled={!!user} {...register('username', { required: 'Required' })} error={errors.username?.message} />
        <Input label="Email *" type="email" {...register('email', { required: 'Required' })} error={errors.email?.message} />
        <Input label="First Name *" {...register('firstName', { required: 'Required' })} error={errors.firstName?.message} />
        <Input label="Last Name *" {...register('lastName', { required: 'Required' })} error={errors.lastName?.message} />
        <Input label="Phone" {...register('phone')} />
        <Select label="Base Role" options={userRoleOptions} {...register('role', { valueAsNumber: true })} />
      </div>
      {!user && <Input label="Password *" type="password" {...register('password', { required: 'Required', minLength: { value: 6, message: 'Min 6 characters' } })} error={errors.password?.message} />}

      {roles && roles.length > 0 && (
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Custom Roles</label>
          <div className="flex flex-wrap gap-2">
            {roles.map(r => (
              <label key={r.id} className="flex items-center gap-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer">
                <input type="checkbox" checked={selectedRoleIds.includes(r.id)} onChange={() => toggleRole(r.id)} className="rounded text-amber-600" />
                {r.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {mutation.isError && <p className="text-sm text-red-600">{String(mutation.error)}</p>}

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting || mutation.isPending}>{user ? 'Save Changes' : 'Create User'}</Button>
      </div>
    </form>
  )
}
