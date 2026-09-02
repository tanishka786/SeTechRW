import { MapPin, Pencil, Trash2, User } from 'lucide-react';
import type { Forklift } from '../../types';
import { relativeUpdated } from '../../utils/formatters';
import { formatMachineId } from '../../utils/validation';
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
  const label = formatMachineId(machine.id);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{label}</h3>
        <Badge variant={statusVariant(machine.status)}>{machine.status}</Badge>
      </div>
      {machine.capacity ? <p className="mt-2 text-sm text-slate-500">{machine.capacity}</p> : null}
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-2 text-slate-500">
            <User size={14} /> Operator
          </dt>
          <dd className="font-medium text-slate-800">{machine.operator}</dd>
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
        <Button variant="ghost" size="sm" aria-label={`Edit ${label}`} onClick={onEdit} icon={<Pencil size={14} />} />
        <Button variant="ghost" size="sm" aria-label={`Delete ${label}`} onClick={onDelete} icon={<Trash2 size={14} />} />
      </div>
    </article>
  );
}
