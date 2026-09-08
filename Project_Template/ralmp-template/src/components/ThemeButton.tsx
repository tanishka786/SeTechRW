import { Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "../store";
import { applyDocumentTheme, DAISY_PALETTES, paletteById } from "../themes";
import { Modal } from "./ui";

export function ThemeButton() {
  const { theme, setTheme, active, patch } = useStore();
  const [open, setOpen] = useState(false);
  const meta = active.meta;
  const [daisyTheme, setDaisyTheme] = useState(meta.daisyTheme);
  const [primary, setPrimary] = useState(meta.primary);
  const [secondary, setSecondary] = useState(meta.secondary);
  const [accent, setAccent] = useState(meta.accent);

  useEffect(() => {
    setDaisyTheme(meta.daisyTheme);
    setPrimary(meta.primary);
    setSecondary(meta.secondary);
    setAccent(meta.accent);
  }, [meta.id, meta.daisyTheme, meta.primary, meta.secondary, meta.accent]);

  useEffect(() => {
    if (!open) return;
    applyDocumentTheme({ mode: theme, daisyTheme, primary, secondary, accent });
  }, [open, theme, daisyTheme, primary, secondary, accent]);

  const restore = () => {
    applyDocumentTheme({
      mode: theme,
      daisyTheme: meta.daisyTheme,
      primary: meta.primary,
      secondary: meta.secondary,
      accent: meta.accent,
    });
    setOpen(false);
  };

  const pickPreset = (id: string) => {
    const pal = paletteById(id);
    setDaisyTheme(pal.id);
    if (pal.id !== "custom") {
      setPrimary(pal.primary);
      setSecondary(pal.secondary);
      setAccent(pal.accent);
      setTheme(pal.mode);
    }
  };

  const save = () => {
    patch((p) => ({
      ...p,
      meta: {
        ...p.meta,
        daisyTheme,
        primary,
        secondary,
        accent,
      },
    }));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-sm h-10 gap-2 rounded-full px-4"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Palette size={16} aria-hidden />
        Color theme
      </button>
      <Modal open={open} title="Color theme" onClose={restore} wide>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Pick a DaisyUI palette or mix your own colours. Saved for this project only.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" className={`btn btn-sm ${theme === "dark" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTheme("dark")}>
            Dark
          </button>
          <button type="button" className={`btn btn-sm ${theme === "light" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTheme("light")}>
            Light
          </button>
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">DaisyUI palettes</p>
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {DAISY_PALETTES.map((pal) => {
            const on = daisyTheme === pal.id;
            return (
              <button
                key={pal.id}
                type="button"
                className={`rounded-xl border p-3 text-left ${on ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : "border-[var(--border)]"}`}
                onClick={() => pickPreset(pal.id)}
              >
                <span className="mb-2 flex gap-1" aria-hidden>
                  <span className="h-4 w-4 rounded-full" style={{ background: pal.primary }} />
                  <span className="h-4 w-4 rounded-full" style={{ background: pal.secondary }} />
                  <span className="h-4 w-4 rounded-full" style={{ background: pal.accent }} />
                </span>
                <span className="text-sm font-semibold">{pal.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Custom colours</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <ColorField label="Primary" value={primary} onChange={(v) => { setPrimary(v); setDaisyTheme("custom"); }} />
          <ColorField label="Secondary" value={secondary} onChange={(v) => { setSecondary(v); setDaisyTheme("custom"); }} />
          <ColorField label="Accent" value={accent} onChange={(v) => { setAccent(v); setDaisyTheme("custom"); }} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-[var(--text-muted)]">Preview</span>
          <button type="button" className="btn btn-primary btn-sm">Primary</button>
          <button type="button" className="btn btn-secondary btn-sm">Secondary</button>
          <button type="button" className="btn btn-accent btn-sm">Accent</button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={restore}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save theme
          </button>
        </div>
      </Modal>
    </>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold text-[var(--text-muted)]">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-2 py-2">
        <input type="color" value={toHex(value)} onChange={(e) => onChange(e.target.value)} aria-label={`${label} colour`} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent" />
        <input
          className="w-full bg-transparent uppercase"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} hex`}
        />
      </span>
    </label>
  );
}

function toHex(v: string) {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#7d9a70";
}
