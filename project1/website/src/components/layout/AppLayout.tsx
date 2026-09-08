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
  '/scan-history': 'Scan History',
  '/analytics': 'Warehouse Analytics',
  '/settings': 'User Profile',
};

export function AppLayout() {
  const [open, setOpen] = useState(true);
  const { pathname } = useLocation();
  const title = titles[pathname] ?? 'Birla Carbon';

  return (
    <div className="flex min-h-dvh items-stretch">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="app-canvas flex min-h-dvh min-w-0 flex-1 flex-col overflow-x-hidden">
        <Topbar title={title} showMenu={!open} onMenu={() => setOpen(true)} />
        <main className="flex min-h-0 flex-1 flex-col px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6 md:py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
