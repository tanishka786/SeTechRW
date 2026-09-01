import { useEffect, useMemo, useState } from 'react';
import { Radio } from 'lucide-react';
import { fetchUwbMapping } from '../api/uwb';
import { ApiError } from '../api/client';
import { HopPath } from '../components/uwb/HopPath';
import { UwbFloorMap } from '../components/uwb/UwbFloorMap';
import { Badge, statusVariant } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/LoadingState';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { StatCard } from '../components/ui/StatCard';
import type { UwbMapping, UwbMappingResponse } from '../types';
import { relativeUpdated } from '../utils/formatters';

export function UwbMappingPage() {
  const [data, setData] = useState<UwbMappingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [forkliftId, setForkliftId] = useState('all');

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
    const timer = window.setInterval(() => void load(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const forkliftOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const row of data?.mappings ?? []) {
      names.set(row.forkliftId, row.forkliftName);
    }
    return [{ value: 'all', label: 'All forklifts' }, ...[...names].map(([value, label]) => ({ value, label }))];
  }, [data]);

  const rows = useMemo(() => {
    const list = data?.mappings ?? [];
    return list.filter((row) => {
      const matchesMachine = forkliftId === 'all' || row.forkliftId === forkliftId;
      const hay = `${row.forkliftName} ${row.tagName} ${row.binName} ${row.primaryName} ${row.chipId}`.toLowerCase();
      return matchesMachine && hay.includes(query.toLowerCase());
    });
  }, [data, forkliftId, query]);

  const nearest = rows.filter((row) => row.isNearest && row.status === 'ok');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">UWB tag-to-bin mapping</h2>
          <p className="text-sm text-slate-500">
            Each forklift tag ranges to the bin primary. If a secondary DWM3001C is in the path, the displayed
            distance is tag→secondary + secondary→primary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={data?.source === 'dwm3001c' ? 'success' : 'accent'}>
            {data?.source === 'dwm3001c' ? 'Live DWM3001C' : 'Dummy DWM3001C'}
          </Badge>
          <p className="text-xs text-slate-500">
            {data ? `Updated ${relativeUpdated(data.updatedAt)}` : 'Connecting…'}
          </p>
        </div>
      </div>

      {error ? <ErrorState title="UWB mapping unavailable" message={error} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Forklift tags" value={String(data?.devices.filter((d) => d.role === 'tag').length ?? 0)} hint="Mounted on machines" />
        <StatCard label="Primary anchors" value={String(data?.devices.filter((d) => d.role === 'primary').length ?? 0)} hint="One per bin" />
        <StatCard label="Secondary anchors" value={String(data?.devices.filter((d) => d.role === 'secondary').length ?? 0)} hint="Relays between tag and bin" />
        <StatCard
          label="Chip"
          value="DWM3001C"
          hint={data?.source === 'dummy' ? 'Simulated until USB/nRF52833 data is connected' : 'Qorvo ranging samples'}
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

      {nearest.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {nearest.map((row) => (
            <article key={row.tagId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.forkliftName}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{row.binName}</p>
              <p className="mt-1 font-mono text-2xl text-brand-maroon">{row.totalDistanceM.toFixed(2)} m</p>
              <p className="mt-2 text-xs text-slate-500">
                {row.hopCount === 0
                  ? 'Direct tag to primary'
                  : `${row.hopCount} secondary hop${row.hopCount === 1 ? '' : 's'}`}
              </p>
              <div className="mt-3">
                <HopPath hops={row.hops} totalM={row.totalDistanceM} />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBar value={query} onChange={setQuery} placeholder="Search forklift, tag, bin, or chip" />
        <Select value={forkliftId} onChange={(e) => setForkliftId(e.target.value)} options={forkliftOptions} className="sm:w-56" />
      </div>

      <DataTable
        rows={rows}
        rowKey={(row) => `${row.tagId}-${row.primaryId}`}
        empty={<EmptyState icon={<Radio />} title="No mappings" description="UWB devices will appear once dummy ranging starts." />}
        columns={[
          { key: 'forkliftName', header: 'Forklift' },
          {
            key: 'tag',
            header: 'Tag',
            render: (row: UwbMapping) => (
              <span>
                {row.tagName}
                <span className="mt-0.5 block font-mono text-[11px] text-slate-400">{row.chipId}</span>
              </span>
            ),
          },
          { key: 'binName', header: 'Bin' },
          { key: 'primaryName', header: 'Primary anchor' },
          {
            key: 'path',
            header: 'Path',
            className: 'whitespace-normal min-w-[22rem]',
            render: (row) => (
              <HopPath hops={row.hops} totalM={row.totalDistanceM} missing={row.status === 'no-signal'} />
            ),
          },
          {
            key: 'hops',
            header: 'Hops',
            render: (row) => (row.hopCount === 0 ? 'Direct' : String(row.hopCount)),
          },
          {
            key: 'distance',
            header: 'Distance',
            render: (row) =>
              row.status === 'ok' ? (
                <span className="font-semibold text-slate-900">{row.totalDistanceM.toFixed(2)} m</span>
              ) : (
                '—'
              ),
          },
          {
            key: 'nearest',
            header: 'Mapping',
            render: (row) =>
              row.isNearest ? <Badge variant="success">Nearest</Badge> : <Badge variant={statusVariant('Idle')}>Farther</Badge>,
          },
        ]}
      />
    </div>
  );
}
