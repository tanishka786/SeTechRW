import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const titles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Warehouse overview' },
  '/products': { title: 'Products', subtitle: 'Manage warehouse products and categories' },
  '/bins': { title: 'Bins', subtitle: 'Storage locations and capacity' },
  '/forklifts': { title: 'Forklifts', subtitle: 'Fleet status and operators' },
  '/uwb': { title: 'UWB Mapping', subtitle: 'Tag to bin primary distances via DWM3001C' },
  '/users': { title: 'User Login Activity', subtitle: 'Operator sessions across machines' },
  '/inventory': { title: 'Inventory', subtitle: 'Stock levels, bins, and movement' },
  '/scanner': { title: 'Barcode & QR Scanner', subtitle: 'Scan a code to look up warehouse records' },
  '/analytics': { title: 'Live Warehouse Analytics', subtitle: 'Real-time operational intelligence' },
  '/settings': { title: 'Settings', subtitle: 'Account and workspace preferences' },
};

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const meta = titles[pathname] ?? { title: 'Birla Carbon' };

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="app-canvas min-w-0 flex-1">
        <Topbar title={meta.title} subtitle={meta.subtitle} onMenu={() => setOpen(true)} />
        <main className="px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
