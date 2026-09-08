import { Download, QrCode, Radio } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Badge, Button, Card, PageHeader } from "../components/ui";
import { categoryName } from "../metrics";
import { useStore } from "../store";
import type { AssetStatus } from "../types";

export function OperationsPage() {
  const { active, patch } = useStore();
  const [cats, setCats] = useState<string[]>([]);
  const [status, setStatus] = useState<AssetStatus | "All">("Active");
  const [place, setPlace] = useState<"All" | "Warehouse" | "Customer" | "InTransit">("All");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    return active.assets.filter((a) => {
      if (cats.length && !cats.includes(a.categoryId)) return false;
      if (status !== "All" && a.status !== status) return false;
      if (place === "Warehouse" && a.locationKind !== "warehouse") return false;
      if (place === "Customer" && a.locationKind !== "customer") return false;
      if (place === "InTransit" && a.locationKind !== "transit") return false;
      if (q && !a.code.toLowerCase().includes(q.toLowerCase()) && !String(a.numericId).includes(q)) return false;
      return true;
    });
  }, [active.assets, cats, status, place, q]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const a of filtered) {
      const name = categoryName(active, a.categoryId);
      map.set(name, [...(map.get(name) ?? []), a]);
    }
    return [...map.entries()];
  }, [filtered, active]);

  const toggleCat = (id: string) => setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const bulk = (mode: "transfer" | "scrap") => {
    patch((p) => ({
      ...p,
      assets: p.assets.map((a) =>
        selected.includes(a.id)
          ? mode === "scrap"
            ? { ...a, status: "Scrapped" as const }
            : { ...a, locationKind: "transit" as const, locationLabel: "In Transit · to customer" }
          : a,
      ),
    }));
    setSelected([]);
  };

  const exportCsv = () => {
    const rows = [["Asset ID", "Category", "Status", "Location"], ...filtered.map((a) => [a.code, categoryName(active, a.categoryId), a.status, a.locationLabel])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.meta.codePrefix}-inventory.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Asset Inventory"
        subtitle="Manage and track all returnable transport items."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv}><Download size={16} /> Export</Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="h-fit p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Filters</h3>
            <button className="text-sm text-[var(--accent)]" onClick={() => { setCats([]); setStatus("All"); setPlace("All"); }}>Reset</button>
          </div>
          <p className="mb-2 text-xs font-bold uppercase text-[var(--text-muted)]">Asset category</p>
          {active.categories.map((c) => (
            <label key={c.id} className="mb-1 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cats.includes(c.id)} onChange={() => toggleCat(c.id)} />
              {c.name}
            </label>
          ))}
          <p className="mb-2 mt-4 text-xs font-bold uppercase text-[var(--text-muted)]">Status</p>
          <div className="flex flex-wrap gap-2">
            {(["All", "Active", "UnderRepair", "Lost", "Scrapped"] as const).map((s) => (
              <button key={s} className={`rounded-full px-3 py-1 text-xs font-semibold ${status === s ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "border border-[var(--border)]"}`} onClick={() => setStatus(s)}>{s}</button>
            ))}
          </div>
          <p className="mb-2 mt-4 text-xs font-bold uppercase text-[var(--text-muted)]">Location</p>
          <div className="flex flex-wrap gap-2">
            {(["All", "Warehouse", "Customer", "InTransit"] as const).map((s) => (
              <button key={s} className={`rounded-full px-3 py-1 text-xs font-semibold ${place === s ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "border border-[var(--border)]"}`} onClick={() => setPlace(s)}>{s}</button>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-sm">Selected: {selected.length}</span>
            <Button size="sm" variant="secondary" disabled={!selected.length} onClick={() => bulk("transfer")}>Bulk Transfer</Button>
            <Button size="sm" variant="danger" disabled={!selected.length} onClick={() => bulk("scrap")}>Scrap</Button>
            <input className="ml-auto rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm" placeholder="Filter ID..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter asset ID" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-[var(--gold)]">
                <tr>
                  <th className="w-8" /><th className="py-2">ASSET ID</th><th>CATEGORY</th><th>HARDWARE</th><th>STATUS</th><th>LOCATION</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(([name, items]) => (
                  <Fragment key={name}>
                    <tr className="border-t border-[var(--border)] bg-[var(--surface-2)]">
                      <td colSpan={6} className="px-2 py-2 font-semibold">{name.toUpperCase()} ({items.length} items)</td>
                    </tr>
                    {items.map((a) => (
                      <tr key={a.id} className="border-t border-[var(--border)]">
                        <td>
                          <input type="checkbox" checked={selected.includes(a.id)} onChange={() => setSelected((s) => s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id])} aria-label={`Select ${a.code}`} />
                        </td>
                        <td className="py-2 font-semibold">{a.code}</td>
                        <td>{categoryName(active, a.categoryId)}</td>
                        <td className="flex gap-1 py-2">
                          {a.hardware.includes("qr") && <QrCode size={16} aria-label="QR" />}
                          {a.hardware.includes("rfid") && <Radio size={16} aria-label="RFID" />}
                        </td>
                        <td><Badge tone={a.status === "Active" ? "ok" : a.status === "UnderRepair" ? "warn" : "danger"}>{a.status}</Badge></td>
                        <td>{a.locationLabel}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
