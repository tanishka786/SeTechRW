import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, KeyRound, Trash2, Pencil, ShieldCheck } from 'lucide-react'
import { usersApi, rolesApi } from '../../api'
import { UserRole, AppModule } from '../../types'
import type { TenantUserAccount, Role } from '../../types'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'
import UserForm from './components/UserForm'
import RoleForm from './components/RoleForm'

type Tab = 'users' | 'roles'

const userRoleLabel: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Super Admin', [UserRole.TenantAdmin]: 'Tenant Admin',
  [UserRole.Manager]: 'Manager', [UserRole.Staff]: 'Staff', [UserRole.ReadOnly]: 'Read Only',
}

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div className="space-y-5">
      <h1 className="page-title">Users & Roles</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['users', 'roles'] as Tab[]).map(key => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >{key === 'users' ? 'Users' : 'Roles & Permissions'}</button>
        ))}
      </div>

      {tab === 'users' ? <UsersTab /> : <RolesTab />}
    </div>
  )
}

function UsersTab() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<TenantUserAccount | null>(null)
  const [resetUser, setResetUser] = useState<TenantUserAccount | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => { toast.success('User deactivated'); qc.invalidateQueries({ queryKey: ['users'] }) },
  })
  const resetMutation = useMutation({
    mutationFn: () => usersApi.resetPassword(resetUser!.id, newPassword),
    onSuccess: () => { toast.success('Password reset'); setResetUser(null); setNewPassword('') },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Add User</Button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="table-th">User</th><th className="table-th">Base Role</th><th className="table-th">Custom Roles</th>
            <th className="table-th">Status</th><th className="table-th">Last Login</th><th className="table-th"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="py-10 text-center text-gray-400">Loading…</td></tr>
            ) : users?.length ? users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="table-td">
                  <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-gray-400">{u.username} · {u.email}</p>
                </td>
                <td className="table-td">{userRoleLabel[u.role]}</td>
                <td className="table-td">
                  {u.roleNames.length ? u.roleNames.map(r => <Badge key={r} label={r} colorClass="bg-purple-50 text-purple-700" className="mr-1" />) : '—'}
                </td>
                <td className="table-td">
                  <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="table-td text-xs text-gray-400">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                <td className="table-td">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => setEditUser(u)} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg"><Pencil size={14} /></button>
                    <button onClick={() => setResetUser(u)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><KeyRound size={14} /></button>
                    <button onClick={() => { if (confirm('Deactivate this user?')) deleteMutation.mutate(u.id) }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan={6} className="py-10 text-center text-gray-400">No users found</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add User" size="lg">
        <UserForm onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User created') }} />
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="lg">
        {editUser && <UserForm user={editUser} onSuccess={() => { setEditUser(null); qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User updated') }} />}
      </Modal>

      <Modal open={!!resetUser} onClose={() => setResetUser(null)} title={`Reset Password: ${resetUser?.username ?? ''}`} size="sm"
        footer={<Button onClick={() => resetMutation.mutate()} loading={resetMutation.isPending} disabled={newPassword.length < 6}>Reset Password</Button>}>
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min. 6 characters)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </Modal>
    </div>
  )
}

function RolesTab() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)

  const { data: roles, isLoading } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list })

  const deleteMutation = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => { toast.success('Role deleted'); qc.invalidateQueries({ queryKey: ['roles'] }) },
    onError: () => toast.error('Failed to delete role'),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Add Role</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {isLoading ? <p className="text-gray-400 text-sm">Loading…</p> : roles?.map(role => (
          <div key={role.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {role.isSystemRole && <ShieldCheck size={14} className="text-amber-600" />}
                  {role.name}
                </h3>
                {role.description && <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>}
                <p className="text-xs text-gray-400 mt-1">{role.userCount} user(s)</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditRole(role)} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg"><Pencil size={14} /></button>
                {!role.isSystemRole && (
                  <button onClick={() => { if (confirm('Delete this role?')) deleteMutation.mutate(role.id) }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-3">
              {role.permissions.filter(p => p.actions > 0).map(p => (
                <Badge key={p.module} label={AppModule[p.module] ?? `Module ${p.module}`} colorClass="bg-blue-50 text-blue-700" />
              ))}
              {role.permissions.every(p => p.actions === 0) && <span className="text-xs text-gray-400">No permissions assigned</span>}
            </div>
          </div>
        ))}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Role" size="xl">
        <RoleForm onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role created') }} />
      </Modal>

      <Modal open={!!editRole} onClose={() => setEditRole(null)} title="Edit Role" size="xl">
        {editRole && <RoleForm role={editRole} onSuccess={() => { setEditRole(null); qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role updated') }} />}
      </Modal>
    </div>
  )
}
