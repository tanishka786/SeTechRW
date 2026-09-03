import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './components/layout/ProtectedRoute';
import { ToastViewport } from './components/ui/Toast';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Analytics } from './pages/Analytics';
import { Bins } from './pages/Bins';
import { Dashboard } from './pages/Dashboard';
import { Forklifts } from './pages/Forklifts';
import { Login } from './pages/Login';
import { OTP } from './pages/OTP';
import { ScanHistory } from './pages/ScanHistory';
import { Scanner } from './pages/Scanner';
import { Settings } from './pages/Settings';
import { UsersPage } from './pages/Users';
import { UwbMappingPage } from './pages/UwbMapping';
import { UwbTablePage } from './pages/UwbTable';

function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Providers>
        <ToastViewport />
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="/otp" element={<OTP />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Navigate to="/" replace />} />
              <Route path="/bins" element={<Bins />} />
              <Route path="/forklifts" element={<Forklifts />} />
              <Route path="/uwb" element={<UwbMappingPage />} />
              <Route path="/uwb/table" element={<UwbTablePage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/inventory" element={<Navigate to="/" replace />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/scan-history" element={<ScanHistory />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}
