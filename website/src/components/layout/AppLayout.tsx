import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/bins': 'Bins',
  '/forklifts': 'Forklifts',
  '/uwb': 'UWB Mapping',
  '/users': 'User Login Activity',
  '/scanner': 'Barcode & QR Scanner',
  '/analytics': 'Live Warehouse Analytics',
  '/settings': 'Settings',
};

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const title = titles[pathname] ?? 'Birla Carbon';

  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="app-canvas min-w-0 flex-1 overflow-x-hidden">
        <Topbar title={title} onMenu={() => setOpen(true)} />
        <main className="px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
