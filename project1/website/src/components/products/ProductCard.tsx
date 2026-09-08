import { Pencil, Trash2 } from 'lucide-react';
import type { Category, Product } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { Button } from '../ui/Button';

export function ProductCard({
  category,
  products,
  onEdit,
  onDelete,
}: {
  category: Category;
  products: Product[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const quantity = products.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-maroon">{category.name}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{category.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{category.description || 'No description'}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" aria-label={`Edit ${category.name}`} onClick={onEdit} icon={<Pencil size={15} />} />
          <Button variant="ghost" size="sm" aria-label={`Delete ${category.name}`} onClick={onDelete} icon={<Trash2 size={15} />} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Products</p>
          <p className="text-lg font-semibold text-slate-900">{products.length}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Quantity</p>
          <p className="text-lg font-semibold text-slate-900">{formatNumber(quantity)}</p>
        </div>
      </div>
    </article>
  );
}
