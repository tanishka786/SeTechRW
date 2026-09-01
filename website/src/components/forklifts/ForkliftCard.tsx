import { Battery, MapPin, Pencil, Trash2, User } from 'lucide-react';
import type { Forklift } from '../../types';
import { relativeUpdated } from '../../utils/formatters';
import { Badge, statusVariant } from '../ui/Badge';
import { Button } from '../ui/Button';

export function ForkliftCard({
  machine,
  onEdit,
  onDelete,
}: {
  machine: Forklift;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{machine.name}</h3>
          <p className="font-mono text-xs text-slate-500">{machine.id}</p>
        </div>
        <Badge variant={statusVariant(machine.status)}>{machine.status}</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {machine.model} · {machine.capacity}
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-2 text-slate-500">
            <User size={14} /> Operator
          </dt>
          <dd className="font-medium text-slate-800">{machine.operator}</dd>
        </div>
        <div>
          <dt className="mb-1 flex items-center justify-between text-slate-500">
            <span className="flex items-center gap-2">
              <Battery size={14} /> Battery
            </span>
            <span className="font-semibold text-slate-800">{machine.battery}%</span>
          </dt>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${machine.battery < 25 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${machine.battery}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-2 text-slate-500">
            <MapPin size={14} /> Location
          </dt>
          <dd className="font-medium text-slate-800">{machine.location}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-slate-400">Last active {relativeUpdated(machine.lastActive)}</p>
      <div className="mt-4 flex gap-1">
        <Button variant="ghost" size="sm" aria-label={`Edit ${machine.name}`} onClick={onEdit} icon={<Pencil size={14} />} />
        <Button variant="ghost" size="sm" aria-label={`Delete ${machine.name}`} onClick={onDelete} icon={<Trash2 size={14} />} />
      </div>
    </article>
  );
}
