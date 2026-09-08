import { Pencil, Plus, Trash2, Warehouse } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, PillTabs, Select, Textarea, Toggle } from "../components/ui";
import { LabelDesigner } from "../components/LabelDesigner";
import { MASTER_TABS } from "../nav";
import { useStore } from "../store";
import type { Category, LocationKind, Partner } from "../types";

export function MastersPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "locations";
  const setTab = (id: string) => setParams({ tab: id });

  return (
    <div>
      <PillTabs items={MASTER_TABS} value={tab} onChange={setTab} />
      {tab === "locations" && <LocationsTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "movements" && <MovementsTab />}
      {tab === "customers" && <PartnersTab kind="customer" />}
      {tab === "suppliers" && <PartnersTab kind="supplier" />}
      {tab === "uom" && <UomTab />}
      {tab === "labels" && <LabelDesigner />}
    </div>
  );
}

function LocationsTab() {
  const { active, patch } = useStore();
  const [sub, setSub] = useState<"tree" | "dept">("tree");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState<LocationKind | null>(null);
  const [name, setName] = useState("");
  const node = active.locations.find((l) => l.id === selected);
  const plants = active.locations.filter((l) => l.kind === "plant");
  const zones = active.locations.filter((l) => l.kind === "zone").length;

  const add = () => {
    if (!name.trim() || !open) return;
    const parentId =
      open === "plant"
        ? null
        : open === "warehouse"
          ? plants[0]?.id ?? null
          : active.locations.find((l) => l.kind === "warehouse")?.id ?? null;
    patch((p) => ({
      ...p,
      locations: [...p.locations, { id: crypto.randomUUID(), name: name.trim(), kind: open, parentId, active: true }],
    }));
    setName("");
    setOpen(null);
  };

  return (
    <>
      <PageHeader
        title="Locations & Departments"
        subtitle="Manage organizational hierarchy and hardware assignments."
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen("plant")}>+ Add Plant</Button>
            <Button variant="secondary" onClick={() => setOpen("warehouse")}>+ Add Warehouse</Button>
            <Button onClick={() => setOpen("zone")}>+ Add Zone</Button>
          </>
        }
      />
      <div className="mb-3 flex gap-2">
        <Button size="sm" variant={sub === "tree" ? "primary" : "secondary"} onClick={() => setSub("tree")}>Hierarchy</Button>
        <Button size="sm" variant={sub === "dept" ? "primary" : "secondary"} onClick={() => setSub("dept")}>Departments</Button>
      </div>
      {sub === "tree" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-widest text-[var(--gold)]">HIERARCHY</h3>
              <Badge>Total Zones: {zones}</Badge>
            </div>
            <ul className="space-y-2">
              {plants.map((plant) => (
                <li key={plant.id}>
                  <TreeRow name={plant.name} active={plant.active} onSelect={() => setSelected(plant.id)} selected={selected === plant.id} />
                  <ul className="ml-4 mt-1 space-y-1">
                    {active.locations.filter((l) => l.parentId === plant.id).map((wh) => (
                      <li key={wh.id}>
                        <TreeRow name={wh.name} active={wh.active} onSelect={() => setSelected(wh.id)} selected={selected === wh.id} />
                        <ul className="ml-4 mt-1 space-y-1">
                          {active.locations.filter((z) => z.parentId === wh.id).map((z) => (
                            <li key={z.id}>
                              <TreeRow name={z.name} active={z.active} onSelect={() => setSelected(z.id)} selected={selected === z.id} />
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {plants.length === 0 && <p className="text-sm text-[var(--text-muted)]">No plants yet. Add a plant to start the hierarchy.</p>}
          </Card>
          <Card>
            {node ? (
              <div className="p-5">
                <h3 className="serif text-2xl">{node.name}</h3>
                <p className="capitalize text-[var(--text-muted)]">{node.kind}</p>
                <div className="mt-3"><Badge tone={node.active ? "ok" : "muted"}>{node.active ? "Active" : "Inactive"}</Badge></div>
                <p className="mt-4 text-sm text-[var(--text-muted)]">Assign RFID readers under Hardware after zones exist.</p>
              </div>
            ) : (
              <EmptyState icon={<Warehouse size={36} />} title="Select a warehouse or zone" body="Select a warehouse or zone from the tree to view details." />
            )}
          </Card>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--gold)]">
              <tr><th className="px-4 py-3">Department</th><th>Plant</th></tr>
            </thead>
            <tbody>
              {active.departments.map((d) => (
                <tr key={d.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">{d.name}</td>
                  <td>{active.locations.find((l) => l.id === d.plantId)?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={!!open} title={`Add ${open ?? ""}`} onClose={() => setOpen(null)}>
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
          <Button onClick={add}>Save</Button>
        </div>
      </Modal>
    </>
  );
}

function TreeRow({ name, active, onSelect, selected }: { name: string; active: boolean; onSelect: () => void; selected: boolean }) {
  return (
    <button className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left ${selected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-2)]"}`} onClick={onSelect}>
      <span>{name}</span>
      <Badge tone={active ? "ok" : "muted"}>{active ? "Active" : "Off"}</Badge>
    </button>
  );
}

function CategoriesTab() {
  const { active, patch } = useStore();
  const [id, setId] = useState(active.categories[0]?.id ?? null);
  const cat = active.categories.find((c) => c.id === id);

  const update = (partial: Partial<Category>) => {
    if (!id) return;
    patch((p) => ({ ...p, categories: p.categories.map((c) => (c.id === id ? { ...c, ...partial } : c)) }));
  };

  const add = () => {
    const c: Category = {
      id: crypto.randomUUID(),
      code: "NEW",
      name: "New category",
      description: "",
      materialClass: "",
      lengthMm: 0,
      cleaning: "VisualInspection",
      frequencyCycles: 10,
      maxLifespanMonths: 48,
      defaultVendorId: null,
      triggerMaintenance: false,
      maxTransitHrs: 48,
      dwellLimitHrs: 24,
      geoFencing: false,
      enforceBounds: false,
      inspectionCheckpoints: false,
      replacementCost: 0,
      rulesCount: 0,
      active: true,
    };
    patch((p) => ({ ...p, categories: [...p.categories, c] }));
    setId(c.id);
  };

  return (
    <>
      <PageHeader title="Asset Typology" subtitle="Master Data Configuration › Asset Categories & Rules" actions={<Button onClick={add}>+ New</Button>} />
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="p-3">
          <p className="mb-2 text-xs font-bold tracking-widest text-[var(--gold)]">CATEGORIES</p>
          {active.categories.map((c) => (
            <button key={c.id} className={`mb-1 w-full rounded-lg px-3 py-2 text-left ${c.id === id ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-2)]"}`} onClick={() => setId(c.id)}>
              {c.name}
            </button>
          ))}
          {active.categories.length === 0 && <p className="text-sm text-[var(--text-muted)]">No categories yet — start with New.</p>}
        </Card>
        {cat ? (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--surface-2)]">▣</div>
                <div>
                  <h3 className="serif text-2xl">{cat.name}</h3>
                  <Badge tone="ok">{cat.active ? "Active" : "Inactive"}</Badge>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Category name"><Input value={cat.name} onChange={(e) => update({ name: e.target.value })} /></Field>
                <Field label="Category code"><Input value={cat.code} onChange={(e) => update({ code: e.target.value })} /></Field>
                <Field label="Description"><Textarea value={cat.description} onChange={(e) => update({ description: e.target.value })} /></Field>
                <Field label="Material class"><Input value={cat.materialClass} onChange={(e) => update({ materialClass: e.target.value })} /></Field>
                <Field label="Length (mm)"><Input type="number" value={cat.lengthMm} onChange={(e) => update({ lengthMm: Number(e.target.value) })} /></Field>
                <Field label="Replacement cost (₹)"><Input type="number" value={cat.replacementCost} onChange={(e) => update({ replacementCost: Number(e.target.value) })} /></Field>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 font-semibold">Lifecycle & Maintenance</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Cleaning requirement">
                  <Select value={cat.cleaning} onChange={(e) => update({ cleaning: e.target.value })}>
                    <option>VisualInspection</option>
                    <option>Wash</option>
                    <option>Sanitize</option>
                  </Select>
                </Field>
                <Field label="Frequency (cycles)"><Input type="number" value={cat.frequencyCycles} onChange={(e) => update({ frequencyCycles: Number(e.target.value) })} /></Field>
                <Field label="Max lifespan (months)"><Input type="number" value={cat.maxLifespanMonths} onChange={(e) => update({ maxLifespanMonths: Number(e.target.value) })} /></Field>
                <Toggle checked={cat.triggerMaintenance} onChange={(v) => update({ triggerMaintenance: v })} label="Trigger maintenance workflow" />
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 font-semibold">Logistics Constraints</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Max transit time (hrs)"><Input type="number" value={cat.maxTransitHrs} onChange={(e) => update({ maxTransitHrs: Number(e.target.value) })} /></Field>
                <Field label="Dwell time limit (hrs)"><Input type="number" value={cat.dwellLimitHrs} onChange={(e) => update({ dwellLimitHrs: Number(e.target.value) })} /></Field>
                <Toggle checked={cat.geoFencing} onChange={(v) => update({ geoFencing: v })} label="Geo-fencing required" />
                <Toggle checked={cat.enforceBounds} onChange={(v) => update({ enforceBounds: v })} label="Enforce location bounds" />
                <Toggle checked={cat.inspectionCheckpoints} onChange={(v) => update({ inspectionCheckpoints: v })} label="Requires inspection checkpoints" />
              </div>
            </Card>
          </div>
        ) : (
          <Card><EmptyState icon={<Plus />} title="No category selected" body="Create a category to configure rules." /></Card>
        )}
      </div>
    </>
  );
}

function MovementsTab() {
  const { active, patch } = useStore();
  return (
    <>
      <PageHeader title="Movement Types" subtitle="Allowed hops in the asset lifecycle." />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-[var(--gold)]">
            <tr>
              <th className="px-4 py-3">CODE</th><th>NAME</th><th>FROM</th><th>TO</th><th>APPROVAL</th>
            </tr>
          </thead>
          <tbody>
            {active.movementTypes.map((m) => (
              <tr key={m.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{m.code}</td>
                <td>{m.name}</td>
                <td>{m.from}</td>
                <td>{m.to}</td>
                <td>
                  <button className="underline" onClick={() => patch((p) => ({ ...p, movementTypes: p.movementTypes.map((x) => x.id === m.id ? { ...x, requiresApproval: !x.requiresApproval } : x) }))}>
                    {m.requiresApproval ? "Required" : "None"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function PartnersTab({ kind }: { kind: Partner["kind"] }) {
  const { active, patch } = useStore();
  const rows = kind === "customer" ? active.customers : active.suppliers;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", category: "", city: "", contact: "" });

  const save = () => {
    const row: Partner = {
      id: crypto.randomUUID(),
      code: form.code || `${kind === "customer" ? "CUST" : "SUP"}-${form.name.slice(0, 5).toUpperCase()}`,
      name: form.name,
      category: form.category || "General",
      city: form.city,
      state: "Maharashtra",
      country: "India",
      contact: form.contact,
      active: true,
      assetsOnSite: 0,
      kind,
    };
    patch((p) => kind === "customer" ? { ...p, customers: [...p.customers, row] } : { ...p, suppliers: [...p.suppliers, row] });
    setOpen(false);
  };

  const remove = (id: string) => {
    patch((p) => kind === "customer" ? { ...p, customers: p.customers.filter((c) => c.id !== id) } : { ...p, suppliers: p.suppliers.filter((c) => c.id !== id) });
  };

  return (
    <>
      <PageHeader
        title={kind === "customer" ? "Customers" : "Suppliers"}
        subtitle={kind === "customer" ? "External sites an asset can be dispatched to." : "Vendors used for repair, wash, and inbound stock."}
        actions={<Button onClick={() => setOpen(true)}>+ New {kind === "customer" ? "Customer" : "Supplier"}</Button>}
      />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-[var(--gold)]">
            <tr>
              <th className="px-4 py-3">CODE</th><th>NAME</th><th>CATEGORY</th><th>LOCATION</th><th>CONTACT</th><th>STATUS</th><th>ASSETS ON SITE</th><th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{r.code}</td>
                <td>{r.name}</td>
                <td>{r.category}</td>
                <td>{r.city}, {r.state}, {r.country}</td>
                <td>{r.contact}</td>
                <td><Badge tone="ok">Active</Badge></td>
                <td>{r.assetsOnSite}</td>
                <td className="space-x-2">
                  <button aria-label="Edit" className="opacity-50"><Pencil size={16} /></button>
                  <button aria-label="Delete" onClick={() => remove(r.id)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal open={open} title={`New ${kind}`} onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="Contact"><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={!form.name}>Save</Button></div>
        </div>
      </Modal>
    </>
  );
}

function UomTab() {
  const { active, patch } = useStore();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  return (
    <>
      <PageHeader title="Units of Measure" subtitle="Shared units used on category dimensions and reports." actions={<Button onClick={() => setOpen(true)}>+ New Unit</Button>} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-[var(--gold)]">
            <tr><th className="px-4 py-3">CODE</th><th>NAME</th><th>CATEGORY</th><th>STATUS</th><th>USED BY</th><th>ACTIONS</th></tr>
          </thead>
          <tbody>
            {active.uoms.map((u) => (
              <tr key={u.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">{u.code}</td>
                <td>{u.name}</td>
                <td>{u.category}</td>
                <td><Badge tone="ok">Active</Badge></td>
                <td>{u.usedBy}</td>
                <td><button aria-label="Delete" onClick={() => patch((p) => ({ ...p, uoms: p.uoms.filter((x) => x.id !== u.id) }))}><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal open={open} title="New unit" onClose={() => setOpen(false)}>
        <Field label="Code"><Input value={code} onChange={(e) => setCode(e.target.value)} /></Field>
        <Field label="Name" ><div className="mt-3"><Input value={name} onChange={(e) => setName(e.target.value)} /></div></Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { patch((p) => ({ ...p, uoms: [...p.uoms, { id: crypto.randomUUID(), code, name, category: "Custom", active: true, usedBy: 0 }] })); setOpen(false); }}>Save</Button>
        </div>
      </Modal>
    </>
  );
}

