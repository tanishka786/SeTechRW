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

export function nextForkliftId(forklifts: Array<{ id: string }>): string {
  return generateId('FLT', forklifts.map((f) => f.id));
}
