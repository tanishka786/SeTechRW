export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidMobile(mobile: string): boolean {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return /^[6-9]\d{9}$/.test(digits.slice(2));
  }
  return /^[6-9]\d{9}$/.test(digits);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateId(prefix: string, existing: string[]): string {
  const numbers = existing
    .map((id) => {
      const match = id.match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
    .filter((n) => Number.isFinite(n));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

export function nextProductId(products: Array<{ id: string }>): string {
  return generateId('P', products.map((p) => p.id));
}

export function nextBinId(bins: Array<{ id: string }>): string {
  return generateId('BIN', bins.map((b) => b.id));
}

export function formatBinId(id: string): string {
  const match = id.match(/(\d+)/);
  if (!match) return id;
  return `Bin ${Number(match[1])}`;
}

export function toStorageBinId(value: string): string {
  const match = value.match(/(\d+)/);
  if (!match) return value.trim();
  return `BIN-${String(Number(match[1])).padStart(3, '0')}`;
}

function compactSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/(\D)0+(\d+)/g, '$1$2')
    .replace(/^0+(\d+)/, '$1');
}

export function matchesSearch(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (haystack.toLowerCase().includes(q)) return true;
  const compactQuery = compactSearch(query);
  if (!compactQuery) return true;
  return compactSearch(haystack).includes(compactQuery);
}

export function nextForkliftId(forklifts: Array<{ id: string }>): string {
  return generateId('FLT', forklifts.map((f) => f.id));
}

export function formatMachineId(id: string): string {
  const match = id.match(/(\d+)/);
  if (!match) return id;
  return `M${Number(match[1])}`;
}

export function toStorageForkliftId(value: string): string {
  const match = value.match(/(\d+)/);
  if (!match) return value.trim().toUpperCase();
  return `FLT-${String(Number(match[1])).padStart(3, '0')}`;
}
