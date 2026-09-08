import { Cpu } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader } from "../components/ui";
import { fmtDate } from "../metrics";
import { useStore } from "../store";

export function HardwarePage() {
  const { active, patch } = useStore();
  const zones = active.locations.filter((l) => l.kind === "zone");

  const add = () => {
    patch((p) => ({
      ...p,
      hardware: [
        ...p.hardware,
        {
          id: crypto.randomUUID(),
          name: `Reader-${p.hardware.length + 1}`,
          kind: "RFID Reader",
          zoneName: zones[0]?.name ?? "Unassigned",
          status: zones[0] ? "Online" : "Unassigned",
          lastPing: new Date().toISOString(),
        },
      ],
    }));
  };

  return (
    <div>
      <PageHeader
        title="Hardware"
        subtitle="RFID readers, handhelds, and gateways assigned to zones."
        actions={<Button onClick={add}>+ Add device</Button>}
      />
      {active.hardware.length === 0 ? (
        <Card>
          <EmptyState icon={<Cpu />} title="No hardware assigned yet" body="Configure zones under Masters, then add readers so the Control Tower can show health." />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[var(--gold)]">
              <tr><th className="px-4 py-3">DEVICE</th><th>KIND</th><th>ZONE</th><th>STATUS</th><th>LAST PING</th></tr>
            </thead>
            <tbody>
              {active.hardware.map((h) => (
                <tr key={h.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">{h.name}</td>
                  <td>{h.kind}</td>
                  <td>{h.zoneName}</td>
                  <td><Badge tone={h.status === "Online" ? "ok" : h.status === "Offline" ? "danger" : "muted"}>{h.status}</Badge></td>
                  <td>{fmtDate(h.lastPing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
