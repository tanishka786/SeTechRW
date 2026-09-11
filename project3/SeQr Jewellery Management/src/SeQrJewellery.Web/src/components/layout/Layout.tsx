import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '../../store/authStore'

export default function Layout() {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
