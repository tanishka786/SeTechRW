import { useState } from "react";
import { useStore } from "../store";
import type { LabelElement, LabelElementType } from "../types";
import { Badge, Button, Field, Input, PageHeader, Select, Textarea, Toggle } from "./ui";

const TOOLS: { type: LabelElementType; label: string; group: string }[] = [
  { type: "text", label: "Text", group: "GENERAL" },
  { type: "field", label: "Field", group: "GENERAL" },
  { type: "datetime", label: "Date/Time", group: "GENERAL" },
  { type: "serial", label: "Serial No.", group: "GENERAL" },
  { type: "barcode", label: "Barcode", group: "BARCODES" },
  { type: "qr", label: "QR Code", group: "BARCODES" },
  { type: "logo", label: "Logo", group: "SHAPES & MEDIA" },
  { type: "line", label: "Line", group: "SHAPES & MEDIA" },
  { type: "rect", label: "Rectangle", group: "SHAPES & MEDIA" },
  { type: "circle", label: "Circle", group: "SHAPES & MEDIA" },
];

export function LabelDesigner() {
  const { active, patch } = useStore();
  const [tplId, setTplId] = useState(active.labels[0]?.id ?? "");
  const tpl = active.labels.find((t) => t.id === tplId) ?? active.labels[0];
  const [sel, setSel] = useState<string | null>(null);
  const el = tpl?.elements.find((e) => e.id === sel);

  const updateTpl = (partial: Partial<typeof tpl>) => {
    if (!tpl) return;
    patch((p) => ({ ...p, labels: p.labels.map((t) => (t.id === tpl.id ? { ...t, ...partial } : t)) }));
  };

  const updateEl = (partial: Partial<LabelElement>) => {
    if (!tpl || !el) return;
    updateTpl({ elements: tpl.elements.map((e) => (e.id === el.id ? { ...e, ...partial } : e)) });
  };

  const add = (type: LabelElementType) => {
    if (!tpl) return;
    const neu: LabelElement = {
      id: crypto.randomUUID(),
      type,
      x: 8,
      y: 8 + tpl.elements.length * 4,
      w: type === "qr" ? 22 : type === "barcode" ? 80 : 40,
      h: type === "barcode" ? 14 : type === "qr" ? 22 : 8,
      text: type === "field" ? "{{AssetCode}}" : type === "serial" ? "000001" : type,
      fontSize: 12,
      bold: false,
      bindField: "AssetCode",
      symbology: type === "qr" ? "QR" : "CODE128",
    };
    updateTpl({ elements: [...tpl.elements, neu] });
    setSel(neu.id);
  };

  const updateElRel = (id: string, partial: Partial<LabelElement>) => {
    if (!tpl) return;
    patch((p) => ({
      ...p,
      labels: p.labels.map((t) =>
        t.id === tpl.id ? { ...t, elements: t.elements.map((e) => (e.id === id ? { ...e, ...partial } : e)) } : t,
      ),
    }));
  };

  if (!tpl) {
    return (
      <div>
        <PageHeader title="Label Templates" subtitle="No templates yet." actions={<Button onClick={() => patch((p) => ({ ...p, labels: [...p.labels, { id: crypto.randomUUID(), name: "Untitled template", widthMm: 100, heightMm: 50, description: "", isDefault: true, status: "Draft", elements: [] }] }))}>Create</Button>} />
      </div>
    );
  }

  const scale = 4;
  const groups = [...new Set(TOOLS.map((t) => t.group))];

  return (
    <div>
      <PageHeader
        title={tpl.name.toUpperCase()}
        subtitle={`${tpl.widthMm}×${tpl.heightMm} mm label designer. Bind {{FieldName}} tokens to asset data.`}
        actions={<Badge tone="gold">{tpl.status}</Badge>}
      />
      <div className="mb-3">
        <Select value={tpl.id} onChange={(e) => setTplId(e.target.value)} aria-label="Template">
          {active.labels.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 xl:grid-cols-[200px_1fr_280px]">
        <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="mb-2 text-xs font-bold tracking-widest text-[var(--gold)]">COMPONENTS</p>
          {groups.map((g) => (
            <div key={g} className="mb-3">
              <p className="mb-1 text-[10px] font-bold tracking-widest text-[var(--text-muted)]">{g}</p>
              <div className="grid grid-cols-2 gap-2">
                {TOOLS.filter((t) => t.group === g).map((t) => (
                  <button key={t.type} className="rounded-lg border border-[var(--border)] px-2 py-2 text-xs hover:bg-[var(--surface-2)]" onClick={() => add(t.type)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>
        <div className="checker grid min-h-[360px] place-items-center rounded-2xl p-6">
          <div
            role="application"
            aria-label="Label canvas"
            className="relative rounded-md bg-white shadow-lg"
            style={{ width: tpl.widthMm * scale, height: tpl.heightMm * scale }}
            onClick={() => setSel(null)}
          >
            {tpl.elements.map((e) => (
              <div
                key={e.id}
                className={`absolute cursor-move overflow-hidden border ${sel === e.id ? "border-orange-500" : "border-transparent"}`}
                style={{ left: e.x * scale, top: e.y * scale, width: e.w * scale, height: e.h * scale, color: "#111" }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setSel(e.id);
                }}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  const startX = ev.clientX;
                  const startY = ev.clientY;
                  const ox = e.x;
                  const oy = e.y;
                  const move = (m: MouseEvent) => {
                    updateElRel(e.id, {
                      x: Math.max(0, ox + (m.clientX - startX) / scale),
                      y: Math.max(0, oy + (m.clientY - startY) / scale),
                    });
                  };
                  const up = () => {
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", up);
                  };
                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", up);
                }}
              >
                <CanvasEl e={e} />
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          {el ? (
            <div className="grid gap-3">
              <p className="text-xs font-bold tracking-widest text-[var(--gold)]">PROPERTIES · {el.type.toUpperCase()}</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="X (mm)"><Input type="number" value={Math.round(el.x)} onChange={(e) => updateEl({ x: Number(e.target.value) })} /></Field>
                <Field label="Y (mm)"><Input type="number" value={Math.round(el.y)} onChange={(e) => updateEl({ y: Number(e.target.value) })} /></Field>
                <Field label="W (mm)"><Input type="number" value={el.w} onChange={(e) => updateEl({ w: Number(e.target.value) })} /></Field>
                <Field label="H (mm)"><Input type="number" value={el.h} onChange={(e) => updateEl({ h: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Bind asset field">
                <Select value={el.bindField} onChange={(e) => updateEl({ bindField: e.target.value, text: `{{${e.target.value}}}` })}>
                  <option>AssetCode</option>
                  <option>Serial</option>
                  <option>BarcodeValue</option>
                  <option>Category</option>
                </Select>
              </Field>
              <Field label="Content" hint="Use {{FieldName}} tokens to pull asset data.">
                <Input value={el.text} onChange={(e) => updateEl({ text: e.target.value })} />
              </Field>
              {el.type === "barcode" && (
                <Field label="Symbology">
                  <Select value={el.symbology} onChange={(e) => updateEl({ symbology: e.target.value })}>
                    <option>CODE128</option>
                    <option>CODE39</option>
                  </Select>
                </Field>
              )}
              <Toggle checked={el.bold} onChange={(v) => updateEl({ bold: v })} label="Bold" />
              <Button variant="danger" onClick={() => updateTpl({ elements: tpl.elements.filter((x) => x.id !== el.id) })}>Delete object</Button>
            </div>
          ) : (
            <div className="grid gap-3">
              <Field label="Template name"><Input value={tpl.name} onChange={(e) => updateTpl({ name: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Width (mm)"><Input type="number" value={tpl.widthMm} onChange={(e) => updateTpl({ widthMm: Number(e.target.value) })} /></Field>
                <Field label="Height (mm)"><Input type="number" value={tpl.heightMm} onChange={(e) => updateTpl({ heightMm: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Description"><Textarea value={tpl.description} onChange={(e) => updateTpl({ description: e.target.value })} /></Field>
              <Toggle checked={tpl.isDefault} onChange={(v) => updateTpl({ isDefault: v })} label="Default template" />
              <p className="text-sm text-[var(--text-muted)]">Select an object on the canvas to edit its properties, or add a component from the left.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function CanvasEl({ e }: { e: LabelElement }) {
  if (e.type === "qr") {
    return <div className="h-full w-full bg-[repeating-conic-gradient(#111_0_25%,#fff_0_50%)] bg-[length:6px_6px]" />;
  }
  if (e.type === "barcode") {
    return (
      <div className="flex h-full flex-col justify-end">
        <div className="flex h-full gap-px">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="flex-1 bg-black" style={{ opacity: i % 3 === 0 ? 0.2 : 1 }} />
          ))}
        </div>
        <div className="text-center text-[8px]">{e.text}</div>
      </div>
    );
  }
  if (e.type === "logo") return <div className="grid h-full place-items-center bg-black text-[10px] text-white">Logo</div>;
  if (e.type === "rect") return <div className="h-full w-full border-2 border-black" />;
  if (e.type === "circle") return <div className="h-full w-full rounded-full border-2 border-black" />;
  if (e.type === "line") return <div className="h-px w-full bg-black mt-2" />;
  return <div className="text-[11px] leading-tight" style={{ fontWeight: e.bold ? 700 : 400 }}>{e.text}</div>;
}
