import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, TenantInfo, UserPermissions } from '../types'
import { PermissionAction } from '../types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserProfile | null
  tenant: TenantInfo | null
  tenantIdentifier: string | null
  permissions: UserPermissions | null
  isAuthenticated: boolean
  setAuth: (token: string, refreshToken: string, user: UserProfile, tenant: TenantInfo, identifier: string, permissions?: UserPermissions) => void
  clearAuth: () => void
  hasPermission: (module: string, action: PermissionAction) => boolean
  canViewAllLeads: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenant: null,
      tenantIdentifier: null,
      permissions: null,
      isAuthenticated: false,
      setAuth: (accessToken, refreshToken, user, tenant, tenantIdentifier, permissions) =>
        set({ accessToken, refreshToken, user, tenant, tenantIdentifier, permissions: permissions ?? null, isAuthenticated: true }),
      clearAuth: () =>
        set({ accessToken: null, refreshToken: null, user: null, tenant: null, tenantIdentifier: null, permissions: null, isAuthenticated: false }),
      hasPermission: (module, action) => {
        const p = get().permissions
        if (!p) return true // legacy sessions without permissions payload default to allowed
        if (p.isSuperAdmin || p.isTenantAdmin) return true
        const actions = p.modules?.[module] ?? 0
        return (actions & action) === action
      },
      canViewAllLeads: () => {
        const p = get().permissions
        if (!p) return true
        if (p.isSuperAdmin || p.isTenantAdmin || p.canViewAllLeads) return true
        const crm = p.modules?.['Crm'] ?? 0
        return (crm & PermissionAction.Manage) === PermissionAction.Manage
      },
    }),
    { name: 'seqr-auth' }
  )
)
