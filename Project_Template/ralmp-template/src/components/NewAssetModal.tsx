import { useEffect, useState } from "react";
import { useStore } from "../store";
import type { AssetStatus, HardwareKind } from "../types";
import { Button, Field, Input, Modal, Select } from "./ui";

export function NewAssetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { active, patch } = useStore();
  const [categoryId, setCategoryId] = useState(active.categories[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [location, setLocation] = useState(active.locations.find((l) => l.kind === "warehouse")?.name ?? "Warehouse");
  const [status, setStatus] = useState<AssetStatus>("Active");

  useEffect(() => {
    if (!open) return;
    setCategoryId(active.categories[0]?.id ?? "");
    setLocation(active.locations.find((l) => l.kind === "warehouse")?.name ?? "Warehouse");
  }, [open, active.categories, active.locations]);

  const submit = () => {
    if (!categoryId) return;
    const cat = active.categories.find((c) => c.id === categoryId);
    const maxNum = active.assets.reduce((m, a) => Math.max(m, a.numericId), 20);
    patch((p) => {
      const next = { ...p, assets: [...p.assets] };
      for (let i = 1; i <= qty; i++) {
        const numericId = maxNum + i;
        const hardware: HardwareKind[] = ["qr"];
        next.assets.push({
          id: crypto.randomUUID(),
          code: `${p.meta.codePrefix}-2026-${String(numericId).padStart(4, "0")}`,
          numericId,
          categoryId,
          status,
          locationLabel: location,
          locationKind: "warehouse",
          locationId: null,
          hardware,
          agingDays: 0,
          manufacturingDate: new Date().toISOString(),
          expiryDate: null,
          lastSeen: new Date().toISOString(),
          replacementCost: cat?.replacementCost ?? 0,
        });
      }
      next.events = [
        {
          id: crypto.randomUUID(),
          message: `Registered ${qty} asset${qty > 1 ? "s" : ""}`,
          detail: cat?.name ?? "Assets",
          time: new Date().toISOString(),
          level: "Info",
        },
        ...next.events,
      ];
      return next;
    });
    onClose();
  };

  return (
    <Modal open={open} title="New Asset" onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Asset category">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {active.categories.length === 0 && <option value="">Add a category in Masters first</option>}
            {active.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity">
          <Input type="number" min={1} max={50} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} />
        </Field>
        <Field label="Starting location">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as AssetStatus)}>
            <option>Active</option>
            <option>UnderRepair</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!categoryId}>
            Register assets
          </Button>
        </div>
      </div>
    </Modal>
  );
}
