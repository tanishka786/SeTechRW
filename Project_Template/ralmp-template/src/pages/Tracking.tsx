import { useMemo, useState } from "react";
import { Card, Kpi, PageHeader, PillTabs } from "../components/ui";
import { fleetStats } from "../metrics";
import { useStore } from "../store";

export function TrackingPage() {
  const { active } = useStore();
  const [tab, setTab] = useState("tower");
  const s = fleetStats(active);

  const columns = ["Registered", "InStock", "DispatchStaging", "Dispatch", "WithCustomer", "Repair", "Lost", "Scrapped"];
  const rows = useMemo(() => {
    const names = [
      ...active.customers.map((c) => c.name),
      "In Transit",
      "Supplier",
      "Warehouse",
      ...active.locations.filter((l) => l.kind === "warehouse").map((l) => l.name),
    ];
    return names.map((name) => {
      const cells: Record<string, number> = {};
      for (const col of columns) cells[col] = 0;
      for (const a of active.assets) {
        const matchRow =
          a.locationLabel === name ||
          (name === "In Transit" && a.locationKind === "transit") ||
          (name === "Supplier" && a.locationKind === "supplier") ||
          (name === "Warehouse" && a.locationKind === "warehouse");
        if (!matchRow) continue;
        if (a.status === "Lost") cells.Lost += 1;
        else if (a.status === "Scrapped") cells.Scrapped += 1;
        else if (a.status === "UnderRepair") cells.Repair += 1;
        else if (a.locationKind === "customer") cells.WithCustomer += 1;
        else if (a.locationLabel.toLowerCase().includes("to customer")) cells.Dispatch += 1;
        else if (a.locationLabel.toLowerCase().includes("staging")) cells.DispatchStaging += 1;
        else if (a.locationKind === "transit" && a.locationLabel.toLowerCase().includes("plant")) cells.DispatchStaging += 1;
        else if (a.locationKind === "warehouse" || a.locationKind === "supplier") cells.InStock += 1;
        else cells.Registered += 1;
      }
      return { name, cells };
    });
  }, [active]);

  return (
    <div>
      <PageHeader title="Global Control Tower" subtitle="Live fleet position across plants, customers, and in-transit lanes." />
      <PillTabs
        items={[{ id: "tower", label: "Control Tower" }, { id: "search", label: "Asset Search" }]}
        value={tab}
        onChange={setTab}
      />
      {tab === "tower" && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi label="Total Fleet" value={s.total} />
            <Kpi label="Available" value={s.available} hint={`${s.total ? Math.round((s.available / s.total) * 100) : 0}%`} tone="ok" />
            <Kpi label="In-Transit" value={s.inTransit} hint={`${s.total ? Math.round((s.inTransit / s.total) * 100) : 0}%`} tone="info" />
            <Kpi label="Maintenance" value={s.repair} hint={`${s.total ? Math.round((s.repair / s.total) * 100) : 0}%`} tone="warn" />
            <Kpi label="Lost/Scrap" value={s.lostScrap} hint={`${s.total ? Math.round((s.lostScrap / s.total) * 100) : 0}%`} tone="danger" />
          </div>
          <Card className="mb-4 p-4">
            <h3 className="font-semibold">Reader health</h3>
            {active.hardware.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">No hardware assigned yet — configure zones under Masters.</p>
            ) : (
              <p className="mt-2 text-sm">{active.hardware.filter((h) => h.status === "Online").length} online · {active.hardware.filter((h) => h.status !== "Online").length} attention</p>
            )}
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex justify-between">
              <h3 className="font-semibold">Live events</h3>
            </div>
            <ul className="space-y-2 text-sm">
              {active.events.slice(0, 6).map((e) => (
                <li key={e.id} className="flex justify-between gap-3 border-b border-[var(--border)] pb-2">
                  <span><strong>{e.message}</strong> — {e.detail}</span>
                  <span className="text-[var(--text-muted)]">{new Date(e.time).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
      {tab === "search" && (
        <Card className="overflow-auto p-3">
          <table className="w-full min-w-[900px] border-separate border-spacing-1 text-center text-sm">
            <thead>
              <tr>
                <th className="text-left"> </th>
                {columns.map((c) => (
                  <th key={c} className="px-2 text-xs text-[var(--text-muted)]">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <th className="whitespace-nowrap pr-3 text-left font-medium">{r.name}</th>
                  {columns.map((c) => {
                    const n = r.cells[c];
                    return (
                      <td key={c}>
                        <div
                          className="rounded-lg py-2"
                          style={{ background: n ? "color-mix(in srgb, var(--accent) 35%, transparent)" : "var(--surface-2)" }}
                          title={`${r.name} — ${c}: ${n} assets`}
                        >
                          {n || ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
