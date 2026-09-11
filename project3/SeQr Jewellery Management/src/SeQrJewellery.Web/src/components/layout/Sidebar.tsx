import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ScanLine, FileText, Users, Wrench,
  Printer, BarChart3, Settings, LogOut, Gem, ChevronRight, Shield, ClipboardCheck,
  TrendingUp, Contact, ShieldCheck, Share2, CalendarClock,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { UserRole, AppModule, PermissionAction } from '../../types'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', module: AppModule.Dashboard },
  { to: '/inventory', icon: Package, label: 'Inventory', module: AppModule.Inventory },
  { to: '/audit-reports', icon: ClipboardCheck, label: 'Audit Reports', module: AppModule.AuditReports },
  { to: '/scan', icon: ScanLine, label: 'Scan & Lookup', module: AppModule.Scan },
  { to: '/invoices', icon: FileText, label: 'Invoices', module: AppModule.Invoices },
  { to: '/customers', icon: Users, label: 'Customers', module: AppModule.Customers },
  { to: '/crm', icon: Contact, label: 'CRM', module: AppModule.Crm },
  { to: '/crm/follow-ups', icon: CalendarClock, label: 'Follow-ups', module: AppModule.Crm },
  { to: '/repairs', icon: Wrench, label: 'Repairs', module: AppModule.Repairs },
  { to: '/print-queue', icon: Printer, label: 'Print Queue', module: AppModule.PrintQueue },
  { to: '/reports', icon: BarChart3, label: 'Reports', module: AppModule.Reports },
  { to: '/rate-history', icon: TrendingUp, label: 'Rate History', module: AppModule.RateHistory },
  { to: '/social', icon: Share2, label: 'Social Media', module: AppModule.Social },
  { to: '/users', icon: ShieldCheck, label: 'Users & Roles', module: AppModule.Users },
  { to: '/settings', icon: Settings, label: 'Settings', module: AppModule.Settings },
]

export default function Sidebar() {
  const { user, tenant, clearAuth, hasPermission } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { clearAuth(); navigate('/login') }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-sm">
            <Gem size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight">SeQr Jewellery</div>
            <div className="text-xs text-amber-600 font-medium truncate max-w-[130px]">{tenant?.businessName ?? 'Loading…'}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.filter(item => hasPermission(AppModule[item.module], PermissionAction.View)).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} />
            <span>{label}</span>
            <ChevronRight size={14} className="ml-auto opacity-30" />
          </NavLink>
        ))}
        {user?.role === UserRole.SuperAdmin && (
          <NavLink to="/admin/tenants" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Shield size={17} />
            <span>Tenants</span>
            <ChevronRight size={14} className="ml-auto opacity-30" />
          </NavLink>
        )}
      </nav>

      {/* User Footer */}
      <div className="px-3 py-4 border-t">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-xs text-gray-500 truncate">{user?.role === UserRole.TenantAdmin ? 'Admin' : user?.role === UserRole.Manager ? 'Manager' : 'Staff'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={17} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
