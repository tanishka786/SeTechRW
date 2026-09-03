import { Link } from 'react-router-dom';
import { Table2 } from 'lucide-react';
import { useUwbMapping } from '../hooks/useUwbMapping';
import { UwbFloorMap } from '../components/uwb/UwbFloorMap';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/LoadingState';
import { StatCard } from '../components/ui/StatCard';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../api/client';

export function UwbMappingPage() {
  const { pushToast } = useToast();
  const { data, error, changeTestCase } = useUwbMapping();
  const testCase = data?.testCase === 'A' ? 'A' : 'C';
  const liveChip = data?.source === 'dwm3001c';

  const onCase = async (next: 'A' | 'C') => {
    try {
      await changeTestCase(next);
    } catch (err) {
      pushToast('error', err instanceof ApiError ? err.message : 'Unable to switch UWB test case.');
    }
  };

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
            <Button variant={testCase === 'C' ? 'primary' : 'outline'} size="sm" onClick={() => void onCase('C')}>
              Case C · Direct
            </Button>
            <Button variant={testCase === 'A' ? 'primary' : 'outline'} size="sm" onClick={() => void onCase('A')}>
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Floor map</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              The forklift tag moves on this map as live UWB distance updates. Dashed line is the nearest bin path.
            </p>
          </div>
          <Link to="/uwb/table">
            <Button variant="outline" size="sm" icon={<Table2 size={14} />}>
              Mapping table
            </Button>
          </Link>
        </div>
        <div className="mt-4">
          {data ? (
            <UwbFloorMap devices={data.devices} mappings={data.mappings} selectedForkliftId="all" />
          ) : (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
          )}
        </div>
      </section>
    </div>
  );
}
