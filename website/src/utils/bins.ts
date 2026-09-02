export const BIN_MAX_KG = 100;

export function binUsedKg(usedKg: number) {
  if (!Number.isFinite(usedKg) || usedKg < 0) return 0;
  return Math.min(BIN_MAX_KG, usedKg);
}

export function binFreeKg(usedKg: number) {
  return BIN_MAX_KG - binUsedKg(usedKg);
}

export function requiredWeightKg(quantity?: number | null) {
  if (!Number.isFinite(quantity) || !quantity || quantity <= 0) return 1;
  return Math.min(BIN_MAX_KG, quantity);
}

export function binFillPercent(usedKg: number) {
  return Math.round((binUsedKg(usedKg) / BIN_MAX_KG) * 100);
}
