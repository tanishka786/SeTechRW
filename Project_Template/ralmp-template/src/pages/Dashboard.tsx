import { AlertTriangle, Box, Package, Trash2, Wrench } from "lucide-react";
import { Card, Kpi } from "../components/ui";
import { useStore } from "../store";
import { fleetStats } from "../metrics";

export function DashboardPage() {
  const { active } = useStore();
  const s = fleetStats(active);
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div>
      <section
        className="mb-6 overflow-hidden rounded-2xl px-6 py-7 text-white"
        style={{ background: "linear-gradient(100deg, #1a3a4a 0%, #2d5a3a 55%, #3d6b3a 100%)" }}
      >
        <p className="text-sm opacity-80">{date}</p>
        <h1 className="serif mt-1 text-4xl">
          {hello}, {active.meta.shortName}
        </h1>
        <p className="mt-2 opacity-90">
          {s.total} assets under management · {s.transitCust + s.transitPlant} currently in transit
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total Fleet" value={s.total} hint={`${s.mom} vs last month`} tone="ok" icon={<Box className="text-[var(--ok)]" />} />
        <Kpi label="In-Plant" value={s.inPlant} hint={`${pct(s.inPlant, s.total)} of fleet`} icon={<Package className="text-[var(--ok)]" />} />
        <Kpi label="In-Trans to Cust" value={s.transitCust} hint={`${pct(s.transitCust, s.total)} of fleet`} icon={<Package className="text-[var(--warn)]" />} />
        <Kpi label="At Customer" value={s.atCustomer} hint={`${pct(s.atCustomer, s.total)} of fleet`} icon={<Package className="text-[var(--warn)]" />} />
        <Kpi label="In-Trans to Plant" value={s.transitPlant} hint={`${pct(s.transitPlant, s.total)} of fleet`} icon={<Package className="text-pink-400" />} />
        <Kpi label="In Maintenance" value={s.repair} hint="Processing delays" tone="danger" icon={<Wrench className="text-[var(--danger)]" />} />
        <Kpi label="Supplier Stock" value={s.supplier} hint={`${pct(s.supplier, s.total)} of fleet`} />
        <Kpi label="Lost / Scrap" value={s.lostScrap} hint="Action Required" tone="danger" icon={<Trash2 className="text-[var(--danger)]" />} />
      </div>
      {s.lostScrap > 0 && (
        <Card className="mt-5 flex items-center gap-3 p-4">
          <AlertTriangle className="text-[var(--danger)]" />
          <p>
            {s.lostScrap} assets need write-off or recovery review. Open <strong>Reports → Lost Assets</strong>.
          </p>
        </Card>
      )}
    </div>
  );
}

function pct(n: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}
