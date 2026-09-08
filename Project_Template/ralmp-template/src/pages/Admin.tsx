import { useState } from "react";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, PillTabs, Select } from "../components/ui";
import { useStore } from "../store";

export function AdminPage() {
  const { active, patch } = useStore();
  const [tab, setTab] = useState("users");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Supervisor");
  const [q, setQ] = useState("");

  const users = active.users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));

  const add = () => {
    patch((p) => ({
      ...p,
      users: [
        ...p.users,
        {
          id: crypto.randomUUID(),
          name,
          email,
          department: "Operations",
          role,
          status: "Invited",
          initials: name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase() || "U",
        },
      ],
    }));
    setOpen(false);
    setName("");
    setEmail("");
  };

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Manage system access and module permissions."
        actions={<Button onClick={() => setOpen(true)}>+ Add New User</Button>}
      />
      <PillTabs
        items={[
          { id: "users", label: "Users & Roles" },
          { id: "roles", label: "Roles & Permissions" },
          { id: "alerts", label: "Alert Rules" },
          { id: "log", label: "Activity Log" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "users" && (
        <Card className="p-4">
          <div className="mb-3 flex gap-2">
            <Input placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--gold)]">
              <tr><th className="py-2">USER</th><th>DEPARTMENT</th><th>ROLE</th><th>STATUS</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[var(--border)]">
                  <td className="py-3">
                    <strong>{u.name}</strong>
                    <div className="text-[var(--text-muted)]">{u.email}</div>
                  </td>
                  <td>{u.department}</td>
                  <td>{u.role}</td>
                  <td><Badge tone={u.status === "Active" ? "ok" : "muted"}>{u.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {tab === "roles" && (
        <Card className="p-4">
          <p className="text-[var(--text-muted)]">Administrator, Operations Manager, Supervisor, and Viewer are included. Connect SSO when you wire a backend.</p>
        </Card>
      )}
      {tab === "alerts" && (
        <Card className="p-4">
          <ul className="space-y-2 text-sm">
            <li>Dwell time exceeded — Warning</li>
            <li>Transit overdue — Critical</li>
            <li>Lifespan warning — Info</li>
          </ul>
        </Card>
      )}
      {tab === "log" && (
        <Card className="p-4">
          <ul className="space-y-2">
            {active.events.map((e) => (
              <li key={e.id} className="border-b border-[var(--border)] py-2 text-sm">{e.message} — {e.detail}</li>
            ))}
          </ul>
        </Card>
      )}
      <Modal open={open} title="Add user" onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Administrator</option>
              <option>Operations Manager</option>
              <option>Supervisor</option>
              <option>Viewer</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add} disabled={!name || !email}>Invite</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
