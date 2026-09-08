export function nextId(prefix: string, existing: string[]) {
  const numbers = existing
    .map((id) => {
      const match = id.match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .filter((n) => Number.isFinite(n));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

export const BIN_MAX_KG = 100;

export function deriveProductStatus(quantity: number, current?: string) {
  if (current === 'Reserved' && quantity > 0) return 'Reserved';
  if (quantity <= 0) return 'Out of Stock';
  if (quantity < 50) return 'Low Stock';
  return 'In Stock';
}

export function deriveBinStatus(usedKg: number, current?: string) {
  if (current === 'Maintenance') return 'Maintenance';
  if (usedKg >= BIN_MAX_KG) return 'Full';
  if (usedKg > 0) return 'Occupied';
  return 'Available';
}

export async function syncBinCounts() {
  const { Bin } = await import('../models/Bin');
  const { Product } = await import('../models/Product');
  const products = await Product.find();
  const bins = await Bin.find();
  for (const bin of bins) {
    bin.productCount = products.filter((p) => p.binId === bin.id).length;
    bin.status = deriveBinStatus(bin.capacity, bin.status);
    await bin.save();
  }
}
