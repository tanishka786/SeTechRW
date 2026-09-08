import { Copy, FolderPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Field, Input, Select } from "../components/ui";
import { useStore } from "../store";

const ACCENTS = [
  { label: "Sage (template.io)", value: "#7d9a70" },
  { label: "Teal", value: "#3aa491" },
  { label: "Navy", value: "#3d5a80" },
  { label: "Copper", value: "#c1783a" },
  { label: "Plum", value: "#7a5ea8" },
];

export function ProjectsPage() {
  const { projects, active, setActive, createProject, duplicateProject, deleteProject } = useStore();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [prefix, setPrefix] = useState("AST");
  const [industry, setIndustry] = useState("Returnable packaging");
  const [accent, setAccent] = useState("#7d9a70");
  const [seedDemo, setSeedDemo] = useState(true);

  const create = () => {
    if (!name.trim() || !shortName.trim()) return;
    createProject({
      name: name.trim().toUpperCase(),
      shortName: shortName.trim(),
      codePrefix: prefix.trim().toUpperCase() || "AST",
      accent,
      daisyTheme: "custom",
      primary: accent,
      secondary: "#3d5a80",
      industry,
      seedDemo,
    });
    setName("");
    setShortName("");
    nav("/dashboard");
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="serif text-4xl text-[var(--gold)]">Projects</h1>
      <p className="mt-2 max-w-2xl text-[var(--text-muted)]">
        Create a new branded instance in <strong>template.io</strong> for each client. After creating, use Color theme to match their brand. Duplicate an existing project to keep the same masters.
      </p>

      <Card className="mt-6 p-5">
        <h2 className="serif text-2xl">New project</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Company / project name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ACME RETURNABLES PUNE" />
          </Field>
          <Field label="Short name (greetings & plants)">
            <Input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="Acme" />
          </Field>
          <Field label="Asset code prefix">
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="ACM" />
          </Field>
          <Field label="Industry">
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </Field>
          <Field label="Accent colour">
            <Select value={accent} onChange={(e) => setAccent(e.target.value)}>
              {ACCENTS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Starter data">
            <Select value={seedDemo ? "demo" : "blank"} onChange={(e) => setSeedDemo(e.target.value === "demo")}>
              <option value="demo">Load demo fleet (easy to explore)</option>
              <option value="blank">Empty project (production-like)</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <Button onClick={create} disabled={!name.trim() || !shortName.trim()}>
            <FolderPlus size={16} /> Create project
          </Button>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {projects.map((p) => {
          const on = p.meta.id === active.meta.id;
          return (
            <Card key={p.meta.id} className={`p-5 ${on ? "ring-2 ring-[var(--accent)]" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{p.meta.industry}</p>
                  <h3 className="serif text-xl">{p.meta.name}</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {p.assets.length} assets · {p.customers.length} customers · prefix {p.meta.codePrefix}
                  </p>
                </div>
                <span className="h-8 w-8 rounded-full" style={{ background: p.meta.accent }} aria-hidden />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { setActive(p.meta.id); nav("/dashboard"); }}>
                  Open
                </Button>
                <Button size="sm" variant="secondary" onClick={() => duplicateProject(p.meta.id)}>
                  <Copy size={14} /> Duplicate
                </Button>
                <Button size="sm" variant="danger" onClick={() => deleteProject(p.meta.id)}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
