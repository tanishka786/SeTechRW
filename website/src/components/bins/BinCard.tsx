import { Eye, Pencil, Trash2 } from 'lucide-react';
import type { Bin } from '../../types';
import { Badge, statusVariant } from '../ui/Badge';
import { Button } from '../ui/Button';

export function BinCard({
  bin,
  onEdit,
  onDelete,
  onView,
}: {
  bin: Bin;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{bin.name}</h3>
          <p className="mt-0.5 font-mono text-xs text-slate-500">{bin.id}</p>
        </div>
        <Badge variant={statusVariant(bin.status)}>{bin.status}</Badge>
      </div>
      <p className="mt-3 text-sm text-slate-500">{bin.location}</p>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span>Capacity</span>
          <span className="font-semibold text-slate-800">{bin.capacity}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-orange transition-all"
            style={{ width: `${bin.capacity}%` }}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-500">Products</span>
        <span className="font-semibold text-slate-900">{bin.productCount}</span>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={onView} icon={<Eye size={14} />}>
          Details
        </Button>
        <Button variant="ghost" size="sm" aria-label={`Edit ${bin.name}`} onClick={onEdit} icon={<Pencil size={14} />} />
        <Button variant="ghost" size="sm" aria-label={`Delete ${bin.name}`} onClick={onDelete} icon={<Trash2 size={14} />} />
      </div>
    </article>
  );
}
