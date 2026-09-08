import { Boxes, Forklift, Package, QrCode, UserRound, Warehouse } from 'lucide-react';
import type { ActivityEvent } from '../../types';

const icons = {
  forklift: Forklift,
  product: Package,
  user: UserRound,
  bin: Warehouse,
  inventory: Boxes,
  scan: QrCode,
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const Icon = icons[event.type];
        return (
          <li key={event.id} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-brand-yellow">
              <Icon size={14} />
            </span>
            <div>
              <p className="text-xs font-semibold text-brand-maroon">{event.time}</p>
              <p className="text-sm text-slate-700">{event.message}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
