import type { ProjectData } from "./types";

export function fleetStats(p: ProjectData) {
  const total = p.assets.length;
  const inPlant = p.assets.filter((a) => a.locationKind === "warehouse" && a.status === "Active").length;
  const transitCust = p.assets.filter((a) => a.locationKind === "transit" && a.locationLabel.toLowerCase().includes("customer")).length;
  const transitPlant = p.assets.filter((a) => a.locationKind === "transit" && a.locationLabel.toLowerCase().includes("plant")).length;
  const atCustomer = p.assets.filter((a) => a.locationKind === "customer" && a.status === "Active").length;
  const repair = p.assets.filter((a) => a.status === "UnderRepair").length;
  const supplier = p.assets.filter((a) => a.locationKind === "supplier").length;
  const lostScrap = p.assets.filter((a) => a.status === "Lost" || a.status === "Scrapped").length;
  return {
    total,
    inPlant,
    transitCust,
    transitPlant,
    atCustomer,
    repair,
    supplier,
    lostScrap,
    available: inPlant,
    inTransit: transitCust + transitPlant,
    mom: "+8.3%",
  };
}

export function categoryName(p: ProjectData, id: string) {
  return p.categories.find((c) => c.id === id)?.name ?? "—";
}

export function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function money(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
