import { Bell } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWarehouse } from '../../context/WarehouseContext';
import { formatMachineId } from '../../utils/validation';

export function NotificationBell() {
  const warehouse = useWarehouse();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const items = useMemo(() => {
    const unassigned = warehouse.forklifts
      .filter((machine) => !machine.operator || machine.operator === 'Unassigned')
      .map((machine) => ({
        id: `op-${machine.id}`,
        title: `${formatMachineId(machine.id)} has no operator`,
        detail: 'Assign an operator from the Forklifts page',
      }));
    const scans =
      warehouse.scanStats.unmatchedToday > 0
        ? [
            {
              id: 'scans',
              title: `${warehouse.scanStats.unmatchedToday} unmatched scan${warehouse.scanStats.unmatchedToday === 1 ? '' : 's'} today`,
              detail: 'Review Scan History',
            },
          ]
        : [];
    const events = warehouse.events.slice(0, 5).map((event) => ({
      id: event.id,
      title: event.message,
      detail: event.time,
    }));
    return [...unassigned, ...scans, ...events].slice(0, 8);
  }, [warehouse.events, warehouse.forklifts, warehouse.scanStats.unmatchedToday]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
      >
        <Bell size={16} />
        {items.length > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-red" />
        ) : null}
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-30" aria-label="Close notifications" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <p className="px-1 text-sm font-semibold text-slate-900">Notifications</p>
            <p className="mb-2 px-1 text-xs text-slate-500">Alerts from warehouse activity in MongoDB</p>
            {items.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-slate-500">No alerts right now</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-auto">
                {items.map((item) => (
                  <li key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-sm font-medium text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
