import { useMemo, useState } from 'react';
import { Forklift, Plus } from 'lucide-react';
import { ForkliftCard } from '../components/forklifts/ForkliftCard';
import { Badge, statusVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { useWarehouse } from '../context/WarehouseContext';
import type { Forklift as ForkliftType, ForkliftStatus } from '../types';
import { relativeUpdated } from '../utils/formatters';
import { nextForkliftId } from '../utils/validation';

const statuses: Array<ForkliftStatus | 'All'> = ['All', 'Active', 'Idle', 'Maintenance', 'Offline'];
const editStatuses: ForkliftStatus[] = ['Active', 'Idle', 'Maintenance', 'Offline'];

const emptyForm = {
  id: '',
  name: '',
  model: '',
  capacity: '',
  operator: 'Unassigned',
  status: 'Idle' as ForkliftStatus,
  location: '',
};

export function Forklifts() {
  const warehouse = useWarehouse();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ForkliftStatus | 'All'>('All');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ForkliftType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const operators = useMemo(() => {
    const names = new Set<string>();
    warehouse.users.forEach((user) => {
      if (user.name) names.add(user.name);
    });
    warehouse.userSessions.forEach((session) => {
      if (session.userName) names.add(session.userName);
    });
    warehouse.forklifts.forEach((machine) => {
      if (machine.operator) names.add(machine.operator);
    });
    names.add('Unassigned');
    if (form.operator) names.add(form.operator);
    return [...names].sort((a, b) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
  }, [form.operator, warehouse.forklifts, warehouse.userSessions, warehouse.users]);

  const filtered = useMemo(
    () =>
      warehouse.forklifts.filter((f) => {
        const matchesQuery = `${f.name} ${f.id} ${f.operator} ${f.location}`.toLowerCase().includes(query.toLowerCase());
        return matchesQuery && (status === 'All' || f.status === status);
      }),
    [query, status, warehouse.forklifts],
  );

  const openCreate = () => {
    void warehouse.refresh();
    setEditing(null);
    setForm({
      ...emptyForm,
      id: nextForkliftId(warehouse.forklifts),
    });
    setError('');
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      id: form.id,
      name: form.name,
      model: form.model,
      capacity: form.capacity,
      operator: form.operator.trim() || 'Unassigned',
      status: form.status,
      location: form.location.trim() || 'Staging',
    };
    const err = editing
      ? await warehouse.updateForklift(editing.id, payload)
      : await warehouse.addForklift(payload);
    setError(err ?? '');
    if (!err) setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Forklifts</h2>
          <p className="text-sm text-slate-500">
            Machine records are stored in MongoDB. Assign an operator when you edit a machine.
          </p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={16} />}>
          Add Machine
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar value={query} onChange={setQuery} placeholder="Search machines" />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as ForkliftStatus | 'All')}
          options={statuses.map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))}
          className="sm:w-48"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Forklift />} title="No machines found" description="Add a forklift to start tracking fleet activity." />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {filtered.map((machine) => (
            <ForkliftCard
              key={machine.id}
              machine={machine}
              onEdit={() => {
                void warehouse.refresh();
                setEditing(machine);
                setForm({
                  id: machine.id,
                  name: machine.name,
                  model: machine.model,
                  capacity: machine.capacity,
                  operator: machine.operator || 'Unassigned',
                  status: machine.status,
                  location: machine.location,
                });
                setError('');
                setOpen(true);
              }}
              onDelete={() => warehouse.deleteForklift(machine.id)}
            />
          ))}
        </div>
      )}

      <DataTable
        rows={filtered}
        rowKey={(row) => row.id}
        empty={null}
        columns={[
          { key: 'name', header: 'Machine name' },
          { key: 'id', header: 'Machine ID' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
          },
          { key: 'operator', header: 'Operator' },
          { key: 'battery', header: 'Battery', render: (row) => `${row.battery}%` },
          { key: 'location', header: 'Current location' },
          { key: 'lastActive', header: 'Last active', render: (row) => relativeUpdated(row.lastActive) },
        ]}
      />

      <Modal
        open={open}
        title={editing ? 'Edit Forklift' : 'Add Forklift'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>{editing ? 'Save' : 'Add Machine'}</Button>
          </>
        }
      >
        <Input label="Machine Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Machine ID" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={Boolean(editing)} />
        <Input label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        <Input label="Capacity" value={form.capacity} placeholder="2.5 Ton" onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        <Select
          label="Operator"
          value={form.operator}
          onChange={(e) => setForm({ ...form, operator: e.target.value })}
          options={operators.map((name) => ({ value: name, label: name }))}
        />
        <Input
          label="Or type operator name"
          value={form.operator}
          onChange={(e) => setForm({ ...form, operator: e.target.value })}
          placeholder="Assign an operator"
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as ForkliftStatus })}
          options={editStatuses.map((s) => ({ value: s, label: s }))}
        />
        <Input label="Current location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </Modal>
    </div>
  );
}
