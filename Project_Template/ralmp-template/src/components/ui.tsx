import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "white";
  size?: "sm" | "md";
}) {
  const styles: Record<string, string> = {
    primary: "bg-[var(--accent)] text-[var(--accent-fg)] hover:brightness-110",
    secondary: "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--border-strong)]",
    ghost: "bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)]",
    danger: "border border-[var(--danger)] text-[var(--danger)] bg-transparent hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",
    white: "bg-[var(--logo-bg)] text-[#111] hover:brightness-95",
  };
  const sizes = size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4";
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:opacity-45 ${sizes} ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  tone = "ok",
  children,
}: {
  tone?: "ok" | "warn" | "danger" | "muted" | "gold";
  children: ReactNode;
}) {
  const map = {
    ok: "bg-[color-mix(in_srgb,var(--ok)_28%,transparent)] text-[var(--text)]",
    warn: "bg-[color-mix(in_srgb,var(--warn)_30%,transparent)] text-[var(--text)]",
    danger: "bg-[color-mix(in_srgb,var(--danger)_28%,transparent)] text-[var(--danger)]",
    muted: "bg-[var(--surface-2)] text-[var(--text-muted)]",
    gold: "bg-[var(--gold)] text-[#111]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[tone]}`}>
      {children}
    </span>
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] ${className}`}>
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold text-[var(--text-muted)]">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[var(--text-muted)]">{hint}</span> : null}
    </label>
  );
}

const fieldClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5 text-[var(--text)] placeholder:text-[var(--text-muted)]";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={fieldClass} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClass} min-h-24`} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={fieldClass} {...props} />;
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const tid = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={tid} className="text-sm font-medium">
        {label}
      </label>
      <button
        id={tid}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`h-7 w-12 rounded-full p-0.5 transition ${checked ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"}`}
      >
        <span className={`block h-6 w-6 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,select,button,textarea")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="presentation">
      <button className="absolute inset-0 bg-black/55" aria-label="Close dialog" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative z-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] ${wide ? "max-w-3xl" : "max-w-lg"}`}
      >
        <h2 id="modal-title" className="serif mb-4 text-2xl">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-16 text-center text-[var(--text-muted)]">
      <div className="opacity-70">{icon}</div>
      <p className="font-semibold text-[var(--text)]">{title}</p>
      <p className="max-w-md text-sm">{body}</p>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="serif text-3xl text-[var(--gold)] md:text-4xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-[var(--text-muted)]">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function PillTabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string; icon?: ReactNode }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" aria-label="Section tabs" className="mb-4 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold ${
              active ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]"
            }`}
            onClick={() => onChange(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "ok" | "danger" | "warn" | "info";
  icon?: ReactNode;
}) {
  const color =
    tone === "danger" ? "text-[var(--danger)]" : tone === "warn" ? "text-[var(--warn)]" : tone === "info" ? "text-[var(--info)]" : tone === "ok" ? "text-[var(--ok)]" : "text-[var(--text)]";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">{label}</p>
        {icon}
      </div>
      <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p>
      {hint ? <p className="mt-1 text-sm text-[var(--text-muted)]">{hint}</p> : null}
    </Card>
  );
}
