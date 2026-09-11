import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import InventoryPage from './pages/inventory/InventoryPage'
import AuditReportsPage from './pages/audit-reports/AuditReportsPage'
import ScanPage from './pages/scan/ScanPage'
import InvoicesPage from './pages/invoices/InvoicesPage'
import CustomersPage from './pages/customers/CustomersPage'
import RepairsPage from './pages/repairs/RepairsPage'
import PrintQueuePage from './pages/print-queue/PrintQueuePage'
import ReportsPage from './pages/reports/ReportsPage'
import SettingsPage from './pages/settings/SettingsPage'
import RateHistoryPage from './pages/rate-history/RateHistoryPage'
import CrmPage from './pages/crm/CrmPage'
import FollowUpsPage from './pages/crm/FollowUpsPage'
import UsersPage from './pages/users/UsersPage'
import SocialPage from './pages/social/SocialPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="audit-reports" element={<AuditReportsPage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="repairs" element={<RepairsPage />} />
            <Route path="print-queue" element={<PrintQueuePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="rate-history" element={<RateHistoryPage />} />
            <Route path="crm" element={<CrmPage />} />
            <Route path="crm/follow-ups" element={<FollowUpsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="social" element={<SocialPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />
    </QueryClientProvider>
  )
}
