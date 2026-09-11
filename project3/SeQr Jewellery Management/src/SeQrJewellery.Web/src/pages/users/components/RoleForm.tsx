import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { rolesApi } from '../../../api'
import { Input } from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'
import { PermissionAction } from '../../../types'
import type { Role, RolePermission } from '../../../types'

interface Props { role?: Role; onSuccess: () => void }

const ACTION_FLAGS: { flag: PermissionAction; label: string }[] = [
  { flag: PermissionAction.View, label: 'View' },
  { flag: PermissionAction.Create, label: 'Create' },
  { flag: PermissionAction.Edit, label: 'Edit' },
  { flag: PermissionAction.Delete, label: 'Delete' },
  { flag: PermissionAction.Manage, label: 'Manage (all)' },
]

export default function RoleForm({ role, onSuccess }: Props) {
  const { data: moduleData } = useQuery({ queryKey: ['role-modules'], queryFn: rolesApi.modules })
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [permissions, setPermissions] = useState<Record<number, number>>(() => {
    const map: Record<number, number> = {}
    role?.permissions.forEach(p => { map[p.module] = p.actions })
    return map
  })

  const toggleAction = (module: number, flag: PermissionAction) => {
    setPermissions(prev => {
      const current = prev[module] ?? 0
      const next = current & flag ? current & ~flag : current | flag
      return { ...prev, [module]: next }
    })
  }

  const mutation = useMutation({
    mutationFn: () => {
      const permissionList: RolePermission[] = Object.entries(permissions)
        .filter(([, actions]) => actions > 0)
        .map(([module, actions]) => ({ module: Number(module), actions }))
      return role
        ? rolesApi.update(role.id, { name, description, permissions: permissionList })
        : rolesApi.create({ name, description, permissions: permissionList })
    },
    onSuccess,
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Role Name *" value={name} onChange={e => setName(e.target.value)} disabled={role?.isSystemRole} />
        <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Permissions</label>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="table-th">Module</th>
              {ACTION_FLAGS.map(a => <th key={a.label} className="table-th text-center">{a.label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {moduleData?.modules.map(m => (
                <tr key={m.value}>
                  <td className="table-td font-medium">{m.name}</td>
                  {ACTION_FLAGS.map(a => (
                    <td key={a.label} className="table-td text-center">
                      <input type="checkbox" className="rounded text-amber-600"
                        checked={((permissions[m.value] ?? 0) & a.flag) === a.flag}
                        onChange={() => toggleAction(m.value, a.flag)} disabled={role?.isSystemRole} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {mutation.isError && <p className="text-sm text-red-600">{String(mutation.error)}</p>}

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!name.trim() || role?.isSystemRole}>
          {role ? 'Save Changes' : 'Create Role'}
        </Button>
      </div>
    </div>
  )
}
