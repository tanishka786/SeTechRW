import { useMemo, useState } from 'react';
import { Plus, Warehouse } from 'lucide-react';
import { BinCard } from '../components/bins/BinCard';
import { Badge, statusVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { useWarehouse } from '../context/WarehouseContext';
import { useToast } from '../context/ToastContext';
import type { Bin, BinStatus } from '../types';
import { nextBinId, formatBinId, toStorageBinId, matchesSearch } from '../utils/validation';
import { BIN_MAX_KG } from '../utils/bins';

const statuses: Array<BinStatus | 'All'> = ['All', 'Available', 'Occupied', 'Full', 'Maintenance'];

export function Bins() {
  const warehouse = useWarehouse();
  const { pushToast } = useToast();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<BinStatus | 'All'>('All');
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<Bin | null>(null);
  const [editing, setEditing] = useState<Bin | null>(null);
  const [form, setForm] = useState({ id: '', capacity: '0', location: '' });
  const [error, setError] = useState('');

  const filtered = useMemo(
    () =>
      warehouse.bins.filter((bin) => {
        const matchesQuery = matchesSearch(
          `${formatBinId(bin.id)} ${bin.id} ${bin.name} ${bin.location}`,
          query,
        );
        const matchesStatus = status === 'All' || bin.status === status;
        return matchesQuery && matchesStatus;
      }),
    [query, status, warehouse.bins],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ id: nextBinId(warehouse.bins), capacity: '0', location: '' });
    setError('');
    setOpen(true);
  };

  const save = async () => {
    const capacity = Math.min(BIN_MAX_KG, Math.max(0, Number(form.capacity)));
    if (!Number.isFinite(Number(form.capacity))) {
      setError('Stored weight must be a number of 0 to 100 kg');
      return;
    }
    const err = editing
      ? await warehouse.updateBin(editing.id, {
          name: formatBinId(editing.id),
          location: form.location,
          capacity,
        })
      : await warehouse.addBin({ id: form.id, name: formatBinId(form.id), location: form.location, capacity });
    setError(err ?? '');
    if (!err) setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate} icon={<Plus size={16} />}>
          New Bin
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar value={query} onChange={setQuery} placeholder="Search bins" />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as BinStatus | 'All')}
          options={statuses.map((s) => ({ value: s, label: s === 'All' ? 'All statuses' : s }))}
          className="sm:w-48"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Warehouse />} title="No bins match" description="Create a bin or clear the current filters." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((bin) => (
            <BinCard
              key={bin.id}
              bin={bin}
              onView={() => setDetails(bin)}
              onEdit={() => {
                setEditing(bin);
                setForm({ id: bin.id, capacity: String(bin.capacity), location: bin.location });
                setError('');
                setOpen(true);
              }}
              onDelete={async () => {
                const err = await warehouse.deleteBin(bin.id);
                if (err) pushToast('error', err);
              }}
            />
          ))}
        </div>
      )}

      <Modal
        open={open}
        title={editing ? 'Edit Bin' : 'Create New Bin'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>{editing ? 'Save' : 'Create Bin'}</Button>
          </>
        }
      >
        <Input
          label="Bin ID"
          value={formatBinId(form.id)}
          onChange={(e) => setForm({ ...form, id: toStorageBinId(e.target.value) })}
          disabled={Boolean(editing)}
        />
        <Input
          label="Stored weight (kg)"
          type="number"
          min={0}
          max={100}
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          hint="Each bin holds up to 100 kg"
        />
        <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </Modal>

      <Modal
        open={Boolean(details)}
        title={details ? formatBinId(details.id) : 'Bin details'}
        onClose={() => setDetails(null)}
        footer={
          <Button variant="outline" onClick={() => setDetails(null)}>
            Close
          </Button>
        }
      >
        {details ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-slate-500">Location: </span>
              {details.location}
            </p>
            <p>
              <span className="text-slate-500">Stored: </span>
              {details.capacity} / 100 kg
            </p>
            <p className="flex items-center gap-2">
              <span className="text-slate-500">Status:</span>
              <Badge variant={statusVariant(details.status)}>{details.status}</Badge>
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
