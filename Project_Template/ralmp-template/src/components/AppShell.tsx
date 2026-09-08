import {
  Bell,
  CircleHelp,
  Monitor,
  Plus,
  Search,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  FolderKanban,
} from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { NAV } from "../nav";
import { useStore } from "../store";
import { Badge, Button, Modal, Select } from "./ui";
import { NewAssetModal } from "./NewAssetModal";
import { ThemeButton } from "./ThemeButton";

export function AppShell() {
  const { active, theme, setTheme, projects, setActive } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [help, setHelp] = useState(false);
  const [notes, setNotes] = useState(false);
  const [newAsset, setNewAsset] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();

  const openNotes = active.notifications.filter((n) => n.status === "Open").length;
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const assets = active.assets
      .filter((a) => a.code.toLowerCase().includes(q) || a.locationLabel.toLowerCase().includes(q))
      .slice(0, 6)
      .map((a) => ({ type: "Asset", label: a.code, sub: a.locationLabel, to: "/operations" }));
    const locs = active.locations
      .filter((l) => l.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map((l) => ({ type: "Location", label: l.name, sub: l.kind, to: "/masters?tab=locations" }));
    return [...assets, ...locs];
  }, [query, active]);

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-soft)] p-3 transition-[width] ${collapsed ? "w-[84px]" : "w-[250px]"}`}
        aria-label="Primary"
      >
        <div className="mb-3 rounded-xl bg-[var(--logo-bg)] p-3 text-[#111]">
          <div className="flex items-center gap-2">
            <LogoMark />
            {!collapsed && (
              <div>
                <div className="text-lg font-bold leading-none tracking-tight">template.io</div>
                <div className="mt-1 text-[10px] font-semibold tracking-wide uppercase opacity-70">
                  Reusable project template
                </div>
              </div>
            )}
          </div>
        </div>
        <Button variant="white" className="mb-4 w-full" onClick={() => setNewAsset(true)} aria-label="Create new asset">
          <Plus size={18} />
          {!collapsed && "New Asset"}
        </Button>
        <nav className="flex-1 space-y-1 overflow-auto app-scroll" aria-label="Modules">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                    isActive
                      ? "bg-[var(--logo-bg)] text-[#1a1a14]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} color={isActive ? "var(--accent)" : "currentColor"} />
                    {!collapsed && item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        <NavLink
          to="/projects"
          className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface)]"
        >
          <FolderKanban size={18} />
          {!collapsed && "Projects"}
        </NavLink>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)]/92 px-4 py-3 backdrop-blur">
          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <p className="hidden max-w-[240px] truncate text-sm font-bold tracking-wide uppercase md:block">
            <button className="text-left" onClick={() => navigate("/projects")} title="Switch or create projects">
              {active.meta.name}
            </button>
          </p>
          <div className="relative mx-auto w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input
              className="h-11 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4"
              placeholder="Search assets, locations, or shipments."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              aria-label="Global search"
            />
            {searchOpen && hits.length > 0 && (
              <ul className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
                {hits.map((h) => (
                  <li key={h.label + h.sub}>
                    <button
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-[var(--surface-2)]"
                      onClick={() => {
                        navigate(h.to);
                        setSearchOpen(false);
                        setQuery("");
                      }}
                    >
                      <span>
                        <strong>{h.label}</strong>
                        <span className="ml-2 text-sm text-[var(--text-muted)]">{h.sub}</span>
                      </span>
                      <Badge tone="muted">{h.type}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeButton />
            <IconBtn label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </IconBtn>
            <IconBtn label="Open TV operations display" onClick={() => navigate("/tv-display")}>
              <Monitor size={18} />
            </IconBtn>
            <IconBtn label={`Notifications, ${openNotes} open`} onClick={() => setNotes(true)}>
              <span className="relative">
                <Bell size={18} />
                {openNotes > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
                    {Math.min(openNotes, 9)}
                  </span>
                )}
              </span>
            </IconBtn>
            <IconBtn label="Help" onClick={() => setHelp(true)}>
              <CircleHelp size={18} />
            </IconBtn>
            <div className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-fg)]" title="Signed in user" aria-label="Current user">
              {active.users[0]?.initials ?? "YA"}
            </div>
          </div>
        </header>
        <main id="main" className="flex-1 p-5 md:p-7">
          <Outlet key={loc.pathname + active.meta.id} />
        </main>
      </div>

      <NewAssetModal open={newAsset} onClose={() => setNewAsset(false)} />

      <Modal open={notes} title="Notifications" onClose={() => setNotes(false)} wide>
        <ul className="max-h-[60vh] space-y-2 overflow-auto app-scroll">
          {active.notifications.slice(0, 20).map((n) => (
            <li key={n.id} className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex items-center justify-between gap-2">
                <strong>{n.assetCode}</strong>
                <Badge tone={n.severity === "Critical" ? "danger" : n.severity === "Warning" ? "warn" : "muted"}>
                  {n.severity}
                </Badge>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {n.type} · {n.category}
              </p>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal open={help} title="How to use this template" onClose={() => setHelp(false)} wide>
        <div className="space-y-3 text-sm leading-relaxed text-[var(--text-muted)]">
          <p>
            This is <strong className="text-[var(--text)]">template.io</strong>. Each project is a separate client with its own branding, colours, and data.
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Open <strong className="text-[var(--text)]">Projects</strong> to create, duplicate, or switch tenants.</li>
            <li>Use the DaisyUI <strong className="text-[var(--text)]">Color theme</strong> button to pick a palette or custom colours.</li>
            <li>Fill <strong className="text-[var(--text)]">Masters</strong> first: locations, categories, customers, then assets.</li>
            <li>Use <strong className="text-[var(--text)]">Operations</strong> for inventory, filters, and bulk transfer.</li>
            <li>The monitor icon opens the TV operations display for shop-floor screens.</li>
          </ol>
          <p>Data stays in this browser (local storage). Duplicate a project to spin up the next client quickly.</p>
          <div className="pt-2">
            <label className="text-xs font-semibold uppercase text-[var(--text-muted)]">Jump to project</label>
            <Select
              className="mt-1"
              value={active.meta.id}
              onChange={(e) => setActive(e.target.value)}
              aria-label="Active project"
            >
              {projects.map((p) => (
                <option key={p.meta.id} value={p.meta.id}>
                  {p.meta.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="grid h-10 w-10 place-items-center rounded-full text-[var(--text)] hover:bg-[var(--surface-2)]"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function LogoMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="8" y="8" width="48" height="48" rx="14" fill="none" stroke="#4f6f45" strokeWidth="3" />
      <text x="32" y="42" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1a1a14" fontFamily="Source Sans 3, sans-serif">
        t
      </text>
    </svg>
  );
}
