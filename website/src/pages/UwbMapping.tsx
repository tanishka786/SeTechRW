import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Eye, Radio } from 'lucide-react';
import { fetchUwbMapping, setUwbTestCase, updateUwbDistance } from '../api/uwb';
import { ApiError } from '../api/client';
import { HopPath } from '../components/uwb/HopPath';
import { UwbFloorMap } from '../components/uwb/UwbFloorMap';
import { Badge, statusVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { StatCard } from '../components/ui/StatCard';
import { useToast } from '../context/ToastContext';
import type { UwbMapping, UwbMappingResponse } from '../types';
import { relativeUpdated } from '../utils/formatters';
import { formatBinId, formatMachineId, matchesSearch } from '../utils/validation';

function DistanceField({
  row,
  onSave,
}: {
  row: UwbMapping;
  onSave: (row: UwbMapping, distanceM: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(row.totalDistanceM.toFixed(2));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(row.totalDistanceM.toFixed(2));
  }, [row.totalDistanceM]);

  const commit = async () => {
    const next = Number(draft);
    if (!Number.isFinite(next) || next < 0) {
      setDraft(row.totalDistanceM.toFixed(2));
      return;
    }
    const rounded = Math.round(next * 1000) / 1000;
    if (rounded === row.totalDistanceM) {
      setDraft(row.totalDistanceM.toFixed(2));
      return;
    }
    setSaving(true);
    try {
      await onSave(row, rounded);
    } finally {
      setSaving(false);
    }
  };

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">
        Distance from {formatMachineId(row.forkliftId)} to {formatBinId(row.binId)}
      </span>
      <input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        disabled={saving || row.hops.some((hop) => hop.source === 'dwm3001c')}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(row.totalDistanceM.toFixed(2));
            e.currentTarget.blur();
          }
        }}
        className="h-10 w-28 rounded-xl border border-slate-200 bg-white px-3 text-right font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15 disabled:opacity-60"
      />
      <span className="text-sm text-slate-500">m</span>
    </label>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-start gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <div className="text-slate-800">{children}</div>
    </div>
  );
}

export function UwbMappingPage() {
  const { pushToast } = useToast();
  const [data, setData] = useState<UwbMappingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [forkliftId, setForkliftId] = useState('all');
  const [details, setDetails] = useState<UwbMapping | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const next = await fetchUwbMapping();
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load UWB mapping.');
        }
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const forkliftOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const row of data?.mappings ?? []) {
      names.set(row.forkliftId, formatMachineId(row.forkliftId));
    }
    return [{ value: 'all', label: 'All forklifts' }, ...[...names].map(([value, label]) => ({ value, label }))];
  }, [data]);

  const rows = useMemo(() => {
    const list = data?.mappings ?? [];
    return list.filter((row) => {
      const matchesMachine = forkliftId === 'all' || row.forkliftId === forkliftId;
      const hay = `${formatMachineId(row.forkliftId)} ${row.forkliftId} ${row.tagName} ${formatBinId(row.binId)} ${row.binId} ${row.primaryName} ${row.chipId}`;
      return matchesMachine && matchesSearch(hay, query);
    });
  }, [data, forkliftId, query]);

  const saveDistance = async (row: UwbMapping, distanceM: number) => {
    try {
      const next = await updateUwbDistance(row.tagId, row.primaryId, distanceM);
      setData(next);
      setError(null);
      setDetails((current) => {
        if (!current || current.tagId !== row.tagId || current.primaryId !== row.primaryId) return current;
        return next.mappings.find((item) => item.tagId === row.tagId && item.primaryId === row.primaryId) ?? current;
      });
    } catch (err) {
      pushToast('error', err instanceof ApiError ? err.message : 'Unable to save distance.');
    }
  };

  const changeTestCase = async (testCase: 'A' | 'C') => {
    try {
      setData(await setUwbTestCase(testCase));
      setError(null);
    } catch (err) {
      pushToast('error', err instanceof ApiError ? err.message : 'Unable to switch UWB test case.');
    }
  };

  const testCase = data?.testCase === 'A' ? 'A' : 'C';
  const liveChip = data?.source === 'dwm3001c';

  return (
    <div className="space-y-6">
      {error ? <ErrorState title="UWB mapping unavailable" message={error} /> : null}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-maroon">DWM3001C test</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Machine 1 · Bin 1</h3>
            <p className="mt-1 text-sm text-slate-500">
              {testCase === 'A'
                ? 'Case A: Tag (Machine 1) → Secondary → Primary (Bin 1). Distances are shown in meters.'
                : 'Case C: Tag (Machine 1) → Primary (Bin 1) direct. Distances are shown in meters.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {liveChip ? <Badge variant="success">Live chip</Badge> : <Badge variant="neutral">Waiting for chips</Badge>}
            <Button variant={testCase === 'C' ? 'primary' : 'outline'} size="sm" onClick={() => void changeTestCase('C')}>
              Case C · Direct
            </Button>
            <Button variant={testCase === 'A' ? 'primary' : 'outline'} size="sm" onClick={() => void changeTestCase('A')}>
              Case A · Hop
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Forklift tags"
          value={String(data?.devices.filter((d) => d.role === 'tag').length ?? 0)}
          hint="Mounted on machines"
        />
        <StatCard
          label="Primary anchors"
          value={String(data?.devices.filter((d) => d.role === 'primary').length ?? 0)}
          hint="One per bin"
        />
        <StatCard
          label="Secondary anchors"
          value={String(data?.devices.filter((d) => d.role === 'secondary').length ?? 0)}
          hint="Relays between tag and bin"
        />
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-sm font-semibold text-slate-900">Floor map</h3>
        <p className="mt-0.5 text-xs text-slate-500">Dashed line is the nearest bin path for each selected tag.</p>
        <div className="mt-4">
          {data ? (
            <UwbFloorMap devices={data.devices} mappings={data.mappings} selectedForkliftId={forkliftId} />
          ) : (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
          )}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar value={query} onChange={setQuery} placeholder="Search forklift, tag, or bin" />
        <Select value={forkliftId} onChange={(e) => setForkliftId(e.target.value)} options={forkliftOptions} className="sm:w-56" />
      </div>

      <DataTable
        rows={rows}
        rowKey={(row) => `${row.tagId}-${row.primaryId}`}
        empty={<EmptyState icon={<Radio />} title="No mappings" description="Add forklifts and bins to see UWB distances." />}
        columns={[
          {
            key: 'forklift',
            header: 'Forklift',
            render: (row) => formatMachineId(row.forkliftId),
          },
          { key: 'tagName', header: 'Tag' },
          {
            key: 'bin',
            header: 'Bin',
            render: (row) => formatBinId(row.binId),
          },
          {
            key: 'distance',
            header: 'Distance',
            render: (row) => <DistanceField row={row} onSave={saveDistance} />,
          },
          {
            key: 'details',
            header: 'Details',
            render: (row) => (
              <Button variant="outline" size="sm" onClick={() => setDetails(row)} icon={<Eye size={14} />}>
                Details
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={Boolean(details)}
        title={details ? `${formatMachineId(details.forkliftId)} · ${formatBinId(details.binId)}` : 'Mapping details'}
        onClose={() => setDetails(null)}
        footer={
          <Button variant="outline" onClick={() => setDetails(null)}>
            Close
          </Button>
        }
      >
        {details ? (
          <div className="space-y-3">
            <DetailRow label="Forklift">{formatMachineId(details.forkliftId)}</DetailRow>
            <DetailRow label="Tag">
              {details.tagName}
              <span className="mt-0.5 block font-mono text-[11px] text-slate-400">{details.chipId}</span>
            </DetailRow>
            <DetailRow label="Bin">{formatBinId(details.binId)}</DetailRow>
            <DetailRow label="Primary">{details.primaryName}</DetailRow>
            <DetailRow label="Hops">{details.hopCount === 0 ? 'Direct' : String(details.hopCount)}</DetailRow>
            <DetailRow label="Path">
              <HopPath hops={details.hops} totalM={details.totalDistanceM} missing={details.status === 'no-signal'} />
            </DetailRow>
            <DetailRow label="Distance">{details.totalDistanceM.toFixed(2)} m</DetailRow>
            <DetailRow label="Source">{details.hops.some((hop) => hop.source === 'dwm3001c') ? 'DWM3001C' : 'Saved / layout'}</DetailRow>
            <DetailRow label="Mapping">
              {details.isNearest ? <Badge variant="success">Nearest</Badge> : <Badge variant={statusVariant('Idle')}>Farther</Badge>}
            </DetailRow>
            <DetailRow label="Updated">{relativeUpdated(details.updatedAt)}</DetailRow>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
