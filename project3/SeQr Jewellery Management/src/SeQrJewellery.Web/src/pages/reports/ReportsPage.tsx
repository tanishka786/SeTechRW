import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'
import { Download } from 'lucide-react'
import { reportsApi } from '../../api'
import { fmtCurrency, fmtDate, fmtWeight } from '../../utils/format'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'

const COLORS = ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#92400e', '#78350f']

type Tab = 'sales' | 'inventory' | 'metalRates'

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])

  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', fromDate, toDate],
    queryFn: () => reportsApi.sales({ fromDate, toDate }),
    enabled: tab === 'sales',
  })

  const { data: inventory, isLoading: invLoading } = useQuery({
    queryKey: ['inventory-report'],
    queryFn: reportsApi.inventory,
    enabled: tab === 'inventory',
  })

  const { data: metalRates, isLoading: ratesLoading } = useQuery({
    queryKey: ['metal-rates'],
    queryFn: () => reportsApi.metalRates(undefined, 30),
    enabled: tab === 'metalRates',
  })

  const [exporting, setExporting] = useState(false)
  const exportCurrent = async () => {
    setExporting(true)
    try {
      if (tab === 'sales') await reportsApi.exportSales({ fromDate, toDate })
      else if (tab === 'inventory') await reportsApi.exportInventory()
      else await reportsApi.exportMetalRates(undefined, 90)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sales', label: 'Sales Report' },
    { key: 'inventory', label: 'Inventory Report' },
    { key: 'metalRates', label: 'Metal Rates' },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <Button variant="secondary" size="sm" onClick={exportCurrent} loading={exporting}><Download size={15} /> Export Excel</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >{label}</button>
        ))}
      </div>

      {/* Sales Report */}
      {tab === 'sales' && (
        <div className="space-y-5">
          {/* Date Filter */}
          <div className="card p-4 flex gap-3 items-center">
            <label className="text-sm font-medium text-gray-700">From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <label className="text-sm font-medium text-gray-700">To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          {salesLoading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : sales ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Total Sales', fmtCurrency(sales.totalSalesAmount)],
                  ['Invoices', sales.totalInvoices.toString()],
                  ['Tax Collected', fmtCurrency(sales.totalTaxCollected)],
                  ['Total Discount', fmtCurrency(sales.totalDiscount)],
                ].map(([l, v]) => (
                  <div key={l} className="card p-4">
                    <p className="text-xs text-gray-500">{l}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{v}</p>
                  </div>
                ))}
              </div>

              {/* Daily Sales */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Daily Sales</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sales.salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => fmtDate(d).slice(0, 5)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: unknown) => [fmtCurrency(v as number), 'Sales']} />
                    <Bar dataKey="amount" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* By Category */}
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Sales by Category</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={sales.salesByCategory} cx="50%" cy="50%" outerRadius={80} dataKey="totalAmount" nameKey="categoryName">
                        {sales.salesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => fmtCurrency(v as number)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* By Metal */}
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Sales by Metal (Weight)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={sales.salesByMetal} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="metalName" tick={{ fontSize: 11 }} width={60} />
                      <Tooltip formatter={(v: unknown) => [`${(v as number).toFixed(3)}g`, 'Weight']} />
                      <Bar dataKey="totalWeight" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Customers */}
              {sales.topCustomers?.length > 0 && (
                <div className="card">
                  <div className="px-5 py-4 border-b"><h3 className="font-semibold text-gray-800">Top Customers</h3></div>
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b">
                      <th className="table-th">#</th><th className="table-th">Customer</th>
                      <th className="table-th">Orders</th><th className="table-th text-right pr-5">Total Spent</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {sales.topCustomers.map((c, i) => (
                        <tr key={c.customerName} className="hover:bg-gray-50">
                          <td className="table-td font-bold text-amber-600">#{i + 1}</td>
                          <td className="table-td font-medium">{c.customerName}</td>
                          <td className="table-td">{c.purchaseCount}</td>
                          <td className="table-td text-right font-bold pr-5">{fmtCurrency(c.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Inventory Report */}
      {tab === 'inventory' && (
        <div className="space-y-5">
          {invLoading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : inventory ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Total Items', inventory.totalItems.toString()],
                  ['In Stock', inventory.totalInStockItems.toString()],
                  ['Stock Value', fmtCurrency(inventory.totalStockValue)],
                  ['Gold Weight', fmtWeight(inventory.totalGoldWeight)],
                ].map(([l, v]) => (
                  <div key={l} className="card p-4">
                    <p className="text-xs text-gray-500">{l}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{v}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Stock by Category</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={inventory.byCategory} cx="50%" cy="50%" outerRadius={80} dataKey="itemCount" nameKey="categoryName">
                        {inventory.byCategory?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="card p-5">
                  <h3 className="font-semibold text-gray-800 mb-4">Stock Value by Metal</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={inventory.byMetal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="metalName" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: unknown) => [fmtCurrency(v as number), 'Value']} />
                      <Bar dataKey="stockValue" fill="#d97706" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {inventory.lowStockItems?.length > 0 && (
                <div className="card border-orange-200">
                  <div className="px-5 py-4 border-b bg-orange-50"><h3 className="font-semibold text-orange-700">⚠ Low Stock Items</h3></div>
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 border-b">
                      <th className="table-th">SKU</th><th className="table-th">Name</th>
                      <th className="table-th">Stock</th><th className="table-th">Reorder Level</th>
                    </tr></thead>
                    <tbody className="divide-y">
                      {inventory.lowStockItems.map(item => (
                        <tr key={item.id} className="hover:bg-orange-50">
                          <td className="table-td font-mono text-xs">{item.sku}</td>
                          <td className="table-td font-medium">{item.name}</td>
                          <td className="table-td"><span className="text-red-600 font-bold">{item.quantityInStock}</span></td>
                          <td className="table-td">{item.reorderLevel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Metal Rates */}
      {tab === 'metalRates' && (
        <div className="space-y-5">
          {ratesLoading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : metalRates?.length ? (
            <>
              {/* Current Rates */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...new Map(metalRates.map(r => [`${r.metalId}-${r.purityId}`, r])).values()].slice(0, 8).map(rate => (
                  <div key={rate.id} className="card p-4 border-amber-200">
                    <p className="text-xs text-gray-500">{rate.metal?.name} {rate.purity?.name}</p>
                    <p className="text-xl font-bold text-amber-700">₹{rate.ratePerGram.toFixed(2)}<span className="text-sm font-normal text-gray-500">/g</span></p>
                    <p className="text-xs text-gray-400">₹{rate.ratePerTola.toFixed(2)}/tola · {fmtDate(rate.rateDate)}</p>
                  </div>
                ))}
              </div>

              {/* Rate History Chart */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Gold Rate Trend (30 days)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={metalRates.slice(-30)}>
                    <defs>
                      <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="rateDate" tick={{ fontSize: 11 }} tickFormatter={d => fmtDate(d).slice(0, 5)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                    <Tooltip formatter={(v: unknown) => [`₹${v as number}/g`, 'Rate']} />
                    <Area type="monotone" dataKey="ratePerGram" stroke="#d97706" strokeWidth={2} fill="url(#rateGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Rate Table */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b"><h3 className="font-semibold text-gray-800">Rate History</h3></div>
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b">
                    <th className="table-th">Date</th><th className="table-th">Metal</th><th className="table-th">Purity</th>
                    <th className="table-th text-right">Per Gram</th><th className="table-th text-right">Per Tola</th>
                    <th className="table-th">Source</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {metalRates.slice(0, 30).map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="table-td">{fmtDate(r.rateDate)}</td>
                        <td className="table-td font-medium">{r.metal?.name ?? '—'}</td>
                        <td className="table-td">{r.purity?.name ?? '—'}</td>
                        <td className="table-td text-right font-semibold">₹{r.ratePerGram.toFixed(2)}</td>
                        <td className="table-td text-right">₹{r.ratePerTola.toFixed(2)}</td>
                        <td className="table-td text-gray-400">{r.source ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <p className="text-gray-400 text-center py-12">No rate data available</p>}
        </div>
      )}
    </div>
  )
}
