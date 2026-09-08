import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Button, Card, Kpi, PageHeader, PillTabs } from "../components/ui";
import { categoryName, fleetStats, money } from "../metrics";
import { REPORT_TABS } from "../nav";
import { useStore } from "../store";
import { useSearchParams } from "react-router-dom";

export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "ops";
  const { active } = useStore();
  const s = fleetStats(active);
  const aging = [
    { name: "0-14d", n: active.assets.filter((a) => a.agingDays < 15).length },
    { name: "15-30d", n: active.assets.filter((a) => a.agingDays >= 15 && a.agingDays < 31).length },
    { name: "31-60d", n: active.assets.filter((a) => a.agingDays >= 31 && a.agingDays < 61).length },
    { name: "60d+", n: active.assets.filter((a) => a.agingDays >= 61).length },
  ];
  const trend = Array.from({ length: 12 }).map((_, i) => ({ d: `W${i + 1}`, v: i === 0 ? 18 : 2 + (i % 3) }));
  const lost = active.assets.filter((a) => a.status === "Lost");
  const util = s.total ? Math.round(((s.total - s.available) / s.total) * 100) : 0;
  const warehouses = active.locations.filter((l) => l.kind === "warehouse").map((w, i) => ({
    name: w.name.replace(active.meta.shortName, "").trim() || w.name,
    v: i === 0 ? 72 : 44,
  }));

  const exportPage = () => {
    const blob = new Blob([JSON.stringify({ project: active.meta.name, tab, generated: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report-${tab}.json`;
    a.click();
  };

  return (
    <div>
      <PageHeader
        title={REPORT_TABS.find((t) => t.id === tab)?.label ?? "Reports"}
        subtitle="Operational deep-dive and performance metrics."
        actions={<Button variant="secondary" onClick={exportPage}><Download size={16} /> Export</Button>}
      />
      <PillTabs items={REPORT_TABS} value={tab} onChange={(id) => setParams({ tab: id })} />

      {tab === "ops" && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Avg Cycle Time" value="8.2 days" tone="ok" />
            <Kpi label="Bottleneck Assets" value={`${Math.max(s.repair + s.transitCust, 0)} units`} tone="danger" />
            <Kpi label="Throughput Rate" value="0.3 units/day" />
            <Kpi label="Avg Delay" value="5.3 days" tone="danger" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 font-semibold">Asset Aging Distribution</h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={aging}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip />
                    <Bar dataKey="n" fill="var(--accent)" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="mb-3 font-semibold">Cycle Time Trends</h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="d" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip />
                    <Line type="monotone" dataKey="v" stroke="#c084fc" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === "roi" && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Global Fleet Utilization" value={`${util}%`} hint="+11.7% vs last month" tone="ok" />
            <Kpi label="Total Asset ROI" value="1.2%" hint="-82.5% vs last month" />
            <Kpi label="Avg Cycles Per Asset" value="3.4" hint="Target: 50.0" />
            <Kpi label="Scrap & Loss Rate" value={`${s.total ? ((s.lostScrap / s.total) * 100).toFixed(1) : 0}%`} tone="danger" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 font-semibold">Fleet Utilization by Region</h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={warehouses}>
                    <XAxis dataKey="name" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip />
                    <Bar dataKey="v" radius={6}>
                      {warehouses.map((_, i) => (
                        <Cell key={i} fill={i ? "var(--warn)" : "var(--accent)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="mb-3 font-semibold">ROI Drivers</h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={[{ name: "Cycle Revenue", value: 161 }, { name: "Maintenance Save", value: 40 }]} dataKey="value" innerRadius={50} outerRadius={80}>
                      <Cell fill="var(--accent)" />
                      <Cell fill="#f04d7d" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}

      {tab === "log" && (
        <Card className="p-4">
          <ul className="space-y-2">
            {active.events.map((e) => (
              <li key={e.id} className="flex justify-between border-b border-[var(--border)] py-2">
                <span>{e.message} — {e.detail}</span>
                <Badge tone={e.level === "Warn" ? "warn" : "muted"}>{e.level}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === "maint" && (
        <Card className="p-4">
          <p>{s.repair} assets currently in the repair queue. Average open age 21 days.</p>
        </Card>
      )}

      {tab === "aging" && (
        <Card className="p-2">
          {active.assets
            .slice()
            .sort((a, b) => b.agingDays - a.agingDays)
            .slice(0, 18)
            .map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                <div>
                  <strong>{a.code}</strong>
                  <span className="ml-2 text-sm text-[var(--text-muted)]">{categoryName(active, a.categoryId)} · {a.locationLabel}</span>
                </div>
                <Badge tone="gold">{a.agingDays}d</Badge>
              </div>
            ))}
        </Card>
      )}

      {tab === "expiry" && (
        <Card className="p-4">
          <p className="mb-3 text-[var(--text-muted)]">No assets have Manufacturing Date and Expiry set yet — demo assets include a few sample dates.</p>
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--gold)]"><tr><th className="py-2">ASSET</th><th>CATEGORY</th><th>EXPIRY</th></tr></thead>
            <tbody>
              {active.assets.filter((a) => a.expiryDate).map((a) => (
                <tr key={a.id} className="border-t border-[var(--border)]">
                  <td className="py-2">{a.code}</td>
                  <td>{categoryName(active, a.categoryId)}</td>
                  <td>{a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "lost" && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Kpi label="Total Lost" value={lost.length} tone="danger" />
            <Kpi label="Replacement value at risk" value={money(lost.reduce((s, a) => s + a.replacementCost, 0))} tone="danger" />
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="text-[var(--gold)]">
                <tr><th className="px-4 py-3">ASSET</th><th>CATEGORY</th><th>LAST KNOWN LOCATION</th><th>DAYS MISSING</th><th>REPLACEMENT COST</th></tr>
              </thead>
              <tbody>
                {lost.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{a.code}</td>
                    <td>{categoryName(active, a.categoryId)}</td>
                    <td>{a.locationLabel}</td>
                    <td>{a.agingDays}</td>
                    <td>{money(a.replacementCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === "cost" && (
        <Card className="p-4">
          <p>Estimated open repair exposure: {money(s.repair * 1200)}. Hook this card to vendor invoices when you connect a backend.</p>
        </Card>
      )}

      {tab === "notes" && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Kpi label="Total (this page)" value={active.notifications.length} />
            <Kpi label="Critical" value={active.notifications.filter((n) => n.severity === "Critical").length} tone="danger" />
            <Kpi label="Open (Unacknowledged)" value={active.notifications.filter((n) => n.status === "Open").length} tone="warn" />
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="text-[var(--gold)]">
                <tr><th className="px-4 py-3">ASSET</th><th>CATEGORY</th><th>TYPE</th><th>SEVERITY</th><th>TRIGGERED</th><th>STATUS</th></tr>
              </thead>
              <tbody>
                {active.notifications.map((n) => (
                  <tr key={n.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{n.assetCode}</td>
                    <td>{n.category}</td>
                    <td>{n.type}</td>
                    <td><Badge tone={n.severity === "Critical" ? "danger" : n.severity === "Warning" ? "warn" : "muted"}>{n.severity}</Badge></td>
                    <td>{new Date(n.triggered).toLocaleString()}</td>
                    <td>{n.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
