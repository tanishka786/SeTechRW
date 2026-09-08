import { Wrench } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "../components/ui";
import { categoryName } from "../metrics";
import { useStore } from "../store";

export function MaintenancePage() {
  const { active, patch } = useStore();
  const rows = active.assets.filter((a) => a.status === "UnderRepair");

  return (
    <div>
      <PageHeader title="Maintenance" subtitle="Assets approved for repair — open one to work through its checkpoint checklist and return it to service." />
      <Card className="overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState icon={<Wrench />} title="No assets in repair" body="Send assets from Operations using bulk actions, or mark them Under Repair when registering." />
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[var(--gold)]">
              <tr>
                <th className="px-4 py-3">ASSET</th><th>CATEGORY</th><th>STAGE</th><th>LOCATION</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-semibold">{a.code}</td>
                  <td>{categoryName(active, a.categoryId)}</td>
                  <td><Badge tone="warn">Checklist</Badge></td>
                  <td>{a.locationLabel}</td>
                  <td>
                    <button
                      className="text-sm font-semibold text-[var(--accent)]"
                      onClick={() =>
                        patch((p) => ({
                          ...p,
                          assets: p.assets.map((x) => (x.id === a.id ? { ...x, status: "Active", locationKind: "warehouse", locationLabel: p.locations.find((l) => l.kind === "warehouse")?.name ?? "Warehouse" } : x)),
                        }))
                      }
                    >
                      Return to service
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
