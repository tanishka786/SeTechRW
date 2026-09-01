export function formatNumber(value: number): string {
  return value.toLocaleString('en-IN');
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function formatTime(date = new Date()): string {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function relativeUpdated(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 15_000) return 'Just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function deriveProductStatus(quantity: number, current?: string): 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Reserved' {
  if (current === 'Reserved' && quantity > 0) return 'Reserved';
  if (quantity <= 0) return 'Out of Stock';
  if (quantity < 50) return 'Low Stock';
  return 'In Stock';
}

export function deriveBinStatus(capacity: number, current?: string): 'Available' | 'Occupied' | 'Full' | 'Maintenance' {
  if (current === 'Maintenance') return 'Maintenance';
  if (capacity >= 95) return 'Full';
  if (capacity >= 40) return 'Occupied';
  return 'Available';
}
