import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Eye, Radio } from 'lucide-react';
import { ApiError } from '../api/client';
import { HopPath } from '../components/uwb/HopPath';
import { Badge, statusVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { useToast } from '../context/ToastContext';
import { useUwbMapping } from '../hooks/useUwbMapping';
import type { UwbMapping } from '../types';
import { relativeUpdated } from '../utils/formatters';
import { formatBinId, formatMachineId, matchesSearch } from '../utils/validation';

function rowKey(row: UwbMapping) {
  return `${row.tagId}-${row.primaryId}`;
}

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

export function UwbDistanceTable() {
  const { pushToast } = useToast();
  const { data, saveDistance } = useUwbMapping();
  const [query, setQuery] = useState('');
  const [forkliftId, setForkliftId] = useState('all');
  const [details, setDetails] = useState<UwbMapping | null>(null);

  const forkliftOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const row of data?.mappings ?? []) {
      names.set(row.forkliftId, formatMachineId(row.forkliftId));
    }
    return [{ value: 'all', label: 'All forklifts' }, ...[...names].map(([value, label]) => ({ value, label }))];
  }, [data]);

  const recentKeys = useMemo(() => {
    return new Set(
      [...(data?.mappings ?? [])]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 2)
        .map(rowKey),
    );
  }, [data]);

  const rows = useMemo(() => {
    const list = (data?.mappings ?? []).filter((row) => {
      const matchesMachine = forkliftId === 'all' || row.forkliftId === forkliftId;
      const hay = `${formatMachineId(row.forkliftId)} ${row.forkliftId} ${row.tagName} ${formatBinId(row.binId)} ${row.binId} ${row.primaryName} ${row.chipId}`;
      return matchesMachine && matchesSearch(hay, query);
    });
    const idNumber = (value: string) => {
      const match = value.match(/(\d+)/);
      return match ? Number(match[1]) : 0;
    };
    return [...list].sort((a, b) => {
      const aRecent = recentKeys.has(rowKey(a));
      const bRecent = recentKeys.has(rowKey(b));
      if (aRecent !== bRecent) return aRecent ? -1 : 1;
      if (aRecent && bRecent) return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      const byMachine = idNumber(a.forkliftId) - idNumber(b.forkliftId);
      if (byMachine !== 0) return byMachine;
      return idNumber(a.binId) - idNumber(b.binId);
    });
  }, [data, forkliftId, query, recentKeys]);

  const onSave = async (row: UwbMapping, distanceM: number) => {
    try {
      const next = await saveDistance(row, distanceM);
      setDetails((current) => {
        if (!current || current.tagId !== row.tagId || current.primaryId !== row.primaryId) return current;
        return next.mappings.find((item) => item.tagId === row.tagId && item.primaryId === row.primaryId) ?? current;
      });
    } catch (err) {
      pushToast('error', err instanceof ApiError ? err.message : 'Unable to save distance.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center gap-2 sm:gap-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search forklift, tag, or bin" />
        <div className="w-36 shrink-0 sm:w-56">
          <Select value={forkliftId} onChange={(e) => setForkliftId(e.target.value)} options={forkliftOptions} />
        </div>
      </div>

      <DataTable
        rows={rows}
        resetKey={`${query}-${forkliftId}`}
        rowKey={rowKey}
        rowClassName={(row) =>
          recentKeys.has(rowKey(row))
            ? 'bg-brand-orange/15 shadow-[inset_3px_0_0_0_#f68529]'
            : undefined
        }
        empty={<EmptyState icon={<Radio />} title="No mappings" description="Add forklifts and bins to see UWB distances." />}
        columns={[
          {
            key: 'serial',
            header: 'Sr No.',
            className: 'w-20',
            render: (_row, index) => index + 1,
          },
          {
            key: 'forklift',
            header: 'Forklift',
            render: (row) => (
              <span className="inline-flex items-center gap-2">
                {formatMachineId(row.forkliftId)}
                {recentKeys.has(rowKey(row)) ? <Badge variant="success">Recent</Badge> : null}
              </span>
            ),
          },
          { key: 'tagName', header: 'Tag' },
          {
            key: 'bin',
            header: 'Bin',
            render: (row) => formatBinId(row.binId),
          },
          {
            key: 'mapping',
            header: 'Mapping',
            render: (row) => (
              <span className="font-medium text-slate-800">
                {formatMachineId(row.forkliftId)} → {formatBinId(row.binId)}
              </span>
            ),
          },
          {
            key: 'distance',
            header: 'Distance',
            render: (row) => <DistanceField row={row} onSave={onSave} />,
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
