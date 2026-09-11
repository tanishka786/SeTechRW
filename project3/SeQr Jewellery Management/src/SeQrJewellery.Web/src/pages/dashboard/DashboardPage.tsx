import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  TrendingUp, Package, Users, Wrench, Printer, IndianRupee,
  ShoppingBag, ArrowRight, AlertCircle, PhoneCall, Scale, ScanLine
} from 'lucide-react'
import { reportsApi, crmApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import { fmtCurrency, fmtDate, fmtDateTime, fmtWeight, invoiceStatusColor, invoiceStatusLabel, followUpTypeLabel } from '../../utils/format'
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import { AppModule, PermissionAction } from '../../types'

const COLORS = ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a']

export default function DashboardPage() {
  const { tenant, hasPermission } = useAuthStore()
  const sym = tenant?.currencySymbol ?? '₹'
  const canInvoice = hasPermission(AppModule[AppModule.Invoices], PermissionAction.View)
  const canScan = hasPermission(AppModule[AppModule.Scan], PermissionAction.View)

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard(),
    refetchInterval: 60000,
  })

  const { data: sales } = useQuery({
    queryKey: ['sales-7d'],
    queryFn: () => {
      const to = new Date().toISOString().split('T')[0]
      const from = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      return reportsApi.sales({ fromDate: from, toDate: to })
    },
  })

  const { data: dueFollowUps } = useQuery({ queryKey: ['due-followups'], queryFn: crmApi.dueFollowUps })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  )

  const stats = [
    { label: "Today's Sales", value: fmtCurrency(dashboard?.todaySales ?? 0, sym), icon: IndianRupee, color: 'bg-amber-100 text-amber-700', sub: dashboard?.todayGoldWeightSold ? fmtWeight(dashboard.todayGoldWeightSold) + ' gold' : undefined },
    { label: 'Monthly Sales', value: fmtCurrency(dashboard?.monthSales ?? 0, sym), icon: TrendingUp, color: 'bg-green-100 text-green-700', sub: dashboard?.monthGoldWeightSold ? fmtWeight(dashboard.monthGoldWeightSold) + ' gold' : undefined },
    { label: 'Items in Stock', value: (dashboard?.inStockItems ?? 0).toString(), icon: Package, color: 'bg-blue-100 text-blue-700', sub: `${dashboard?.totalItems ?? 0} total` },
    { label: 'Customers', value: (dashboard?.totalCustomers ?? 0).toString(), icon: Users, color: 'bg-purple-100 text-purple-700' },
    { label: 'Pending Repairs', value: (dashboard?.pendingRepairs ?? 0).toString(), icon: Wrench, color: 'bg-orange-100 text-orange-700' },
    { label: 'Print Jobs', value: (dashboard?.pendingPrintJobs ?? 0).toString(), icon: Printer, color: 'bg-teal-100 text-teal-700' },
  ]

  const metalStats = [
    { label: 'Gold sold today', value: fmtWeight(dashboard?.todayGoldWeightSold ?? 0), sub: `This month ${fmtWeight(dashboard?.monthGoldWeightSold ?? 0)}`, color: 'bg-amber-100 text-amber-800' },
    { label: 'Gold in stock', value: fmtWeight(dashboard?.goldStockWeight ?? 0), sub: 'Net metal weight', color: 'bg-yellow-100 text-yellow-800' },
    { label: 'Silver in stock', value: fmtWeight(dashboard?.silverStockWeight ?? 0), sub: dashboard?.todayOldGoldWeight ? `Old gold in ${fmtWeight(dashboard.todayOldGoldWeight)}` : 'Net metal weight', color: 'bg-slate-100 text-slate-700' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here's what's happening today.</p>
        </div>
        {canInvoice && (
          <Link to="/invoices?new=1" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
            <ShoppingBag size={16} /> New Sale
          </Link>
        )}
      </div>

      {(canInvoice || canScan) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {canInvoice && (
            <Link to="/invoices?new=1" className="card p-4 flex items-start gap-3 hover:border-amber-300 hover:shadow-sm transition-all group">
              <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 group-hover:bg-amber-700">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">New Sale</p>
                <p className="text-xs text-gray-500 mt-0.5">Scan jewellery and bill a customer</p>
              </div>
            </Link>
          )}
          {canInvoice && (
            <Link to="/invoices?new=1&exchange=1" className="card p-4 flex items-start gap-3 hover:border-amber-300 hover:shadow-sm transition-all group">
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:bg-amber-200">
                <Scale size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Metal Exchange</p>
                <p className="text-xs text-gray-500 mt-0.5">Old gold credit against new jewellery</p>
              </div>
            </Link>
          )}
          {canScan && (
            <Link to="/scan" className="card p-4 flex items-start gap-3 hover:border-amber-300 hover:shadow-sm transition-all group">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-200">
                <ScanLine size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">RFID Scan</p>
                <p className="text-xs text-gray-500 mt-0.5">Lookup barcode, QR, or RFID EPC</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <div className="text-xl font-bold text-gray-900 mb-0.5">{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
            {sub && <div className="text-xs text-amber-700 font-medium mt-1">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metalStats.map(({ label, value, sub, color }) => (
          <div key={label} className="stat-card flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Scale size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-sm text-gray-600">{label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Sales (Last 7 Days)</h2>
            <span className="text-[11px] text-gray-400">₹ sales · gold grams</span>
            <Link to="/reports" className="text-xs text-amber-600 hover:underline flex items-center gap-1">View Reports <ArrowRight size={12} /></Link>
          </div>
          {sales?.salesByDay ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={sales.salesByDay} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => fmtDate(d).slice(0, 5)} />
                <YAxis yAxisId="rs" tick={{ fontSize: 11 }} tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="g" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Number(v).toFixed(0)}g`} />
                <Tooltip
                  formatter={(v: unknown, name: unknown) =>
                    name === 'goldWeight'
                      ? [fmtWeight(v as number), 'Gold']
                      : [fmtCurrency(v as number, sym), 'Sales']}
                />
                <Area yAxisId="rs" type="monotone" dataKey="amount" stroke="#d97706" strokeWidth={2} fill="url(#salesGrad)" />
                <Bar yAxisId="g" dataKey="goldWeight" fill="#a16207" radius={[3, 3, 0, 0]} barSize={14} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">No sales data</div>
          )}
        </div>

        {/* Sales by Category Pie */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Sales by Category</h2>
          {sales?.salesByCategory?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sales.salesByCategory} cx="50%" cy="50%" outerRadius={75} dataKey="totalAmount" nameKey="categoryName">
                  {sales.salesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => fmtCurrency(v as number, sym)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-800">Recent Invoices</h2>
            <Link to="/invoices" className="text-xs text-amber-600 hover:underline flex items-center gap-1">View All <ArrowRight size={12} /></Link>
          </div>
          <div className="divide-y">
            {dashboard?.recentInvoices?.length ? dashboard.recentInvoices.map((inv) => (
              <Link key={inv.invoiceNumber} to={`/invoices`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">{inv.customerName ?? 'Walk-in'} · {fmtDate(inv.invoiceDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge label={invoiceStatusLabel[inv.status]} colorClass={invoiceStatusColor[inv.status]} />
                  <span className="text-sm font-semibold text-gray-800">{fmtCurrency(inv.totalAmount, sym)}</span>
                </div>
              </Link>
            )) : (
              <div className="py-10 text-center text-gray-400 flex flex-col items-center gap-2">
                <AlertCircle size={28} className="text-gray-300" />
                <p>No recent invoices</p>
              </div>
            )}
          </div>
        </div>

        {/* CRM: Due Follow-ups */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-800">Follow-ups Due</h2>
            <Link to="/crm/follow-ups" className="text-xs text-amber-600 hover:underline flex items-center gap-1">View Follow-ups <ArrowRight size={12} /></Link>
          </div>
          <div className="divide-y max-h-[340px] overflow-y-auto">
            {dueFollowUps?.length ? dueFollowUps.map(f => (
              <Link key={f.id} to="/crm/follow-ups" className="flex items-start gap-2 px-5 py-3 hover:bg-gray-50 transition-colors">
                <PhoneCall size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.leadName}</p>
                  <p className="text-xs text-gray-500">{followUpTypeLabel[f.type]} · {fmtDateTime(f.scheduledAt)}</p>
                </div>
              </Link>
            )) : (
              <div className="py-10 text-center text-gray-400 flex flex-col items-center gap-2">
                <PhoneCall size={24} className="text-gray-300" />
                <p className="text-sm">No follow-ups due</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
