import { useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select } from "../components/ui";
import { fmtDate } from "../metrics";
import { useStore } from "../store";

export function CycleCountsPage() {
  const { active, patch } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [wh, setWh] = useState(active.locations.find((l) => l.kind === "warehouse")?.name ?? "");
  const [cat, setCat] = useState("");

  const start = () => {
    patch((p) => ({
      ...p,
      cycleCounts: [
        {
          id: crypto.randomUUID(),
          name: name || `Count ${new Date().toLocaleDateString()}`,
          warehouseName: wh,
          categoryName: active.categories.find((c) => c.id === cat)?.name ?? "All categories",
          started: new Date().toISOString(),
          completed: null,
          found: 0,
          missing: 0,
          unexpected: 0,
          status: "In Progress",
        },
        ...p.cycleCounts,
      ],
    }));
    setOpen(false);
    setName("");
  };

  return (
    <div>
      <PageHeader
        title="Cycle Counts"
        subtitle="Physical stocktake sessions — start one, then work through it from the floor."
        actions={<Button onClick={() => setOpen(true)}>Start Count</Button>}
      />
      <Card className="overflow-x-auto">
        {active.cycleCounts.length === 0 ? (
          <EmptyState icon={null} title="No cycle counts yet" body="Start a count against a warehouse and optional category." />
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-[var(--gold)]">
              <tr>
                <th className="px-4 py-3">NAME</th><th>WAREHOUSE / CATEGORY</th><th>STARTED</th><th>COMPLETED</th><th>FOUND</th><th>MISSING</th><th>UNEXPECTED</th><th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {active.cycleCounts.map((c) => (
                <tr key={c.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">{c.name}</td>
                  <td>{c.warehouseName} · {c.categoryName}</td>
                  <td>{fmtDate(c.started)}</td>
                  <td>{fmtDate(c.completed)}</td>
                  <td>{c.found}</td>
                  <td>{c.missing}</td>
                  <td>{c.unexpected}</td>
                  <td><Badge tone={c.status === "Completed" ? "ok" : "warn"}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={open} title="Start Cycle Count" onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <Field label="Count name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Warehouse">
            <Select value={wh} onChange={(e) => setWh(e.target.value)}>
              {active.locations.filter((l) => l.kind === "warehouse").map((l) => (
                <option key={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Asset category (optional — all if blank)">
            <Select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">All categories</option>
              {active.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={start}>Start</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
