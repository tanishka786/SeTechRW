import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { StoreProvider } from "./store";
import { AdminPage } from "./pages/Admin";
import { CycleCountsPage } from "./pages/CycleCounts";
import { DashboardPage } from "./pages/Dashboard";
import { HardwarePage } from "./pages/Hardware";
import { MaintenancePage } from "./pages/Maintenance";
import { MastersPage } from "./pages/Masters";
import { OperationsPage } from "./pages/Operations";
import { ProjectsPage } from "./pages/Projects";
import { ReportsPage } from "./pages/Reports";
import { TrackingPage } from "./pages/Tracking";
import { TvDisplayPage } from "./pages/TvDisplay";

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/tv-display" element={<TvDisplayPage />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/masters" element={<MastersPage />} />
            <Route path="/operations" element={<OperationsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/cycle-counts" element={<CycleCountsPage />} />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/hardware" element={<HardwarePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
