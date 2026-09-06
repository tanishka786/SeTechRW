import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useUwbMapping } from '../hooks/useUwbMapping';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/LoadingState';
import { StatCard } from '../components/ui/StatCard';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../api/client';
import { UwbDistanceTable } from './UwbTable';

export function UwbMappingPage() {
  const { pushToast } = useToast();
  const { data, error, changeTestCase, restartTest } = useUwbMapping();
  const [restarting, setRestarting] = useState(false);
  const testCase = data?.testCase === 'A' ? 'A' : 'C';
  const liveChip = data?.source === 'dwm3001c';

  const onCase = async (next: 'A' | 'C') => {
    try {
      await changeTestCase(next);
    } catch (err) {
      pushToast('error', err instanceof ApiError ? err.message : 'Unable to switch UWB test case.');
    }
  };

  const onRestart = async () => {
    setRestarting(true);
    try {
      await restartTest();
      pushToast('success', 'Two-bin test restarted. Case C is selected. Start the three chip scripts.');
    } catch (err) {
      pushToast('error', err instanceof ApiError ? err.message : 'Unable to restart the two-bin test.');
    } finally {
      setRestarting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <ErrorState title="UWB mapping unavailable" message={error} /> : null}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-maroon">DWM3001C test</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">Two-bin placement · Machine 1</h3>
            <p className="mt-1 text-sm text-slate-500">
              {testCase === 'A'
                ? 'Case A is the hop test (Tag → Secondary → Bin 1). Do not use it for End journey placement.'
                : 'Use Case C · Direct for this test. Tag ranges to Bin 1 and Bin 2. End journey stores in the nearer live bin.'}
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
            <Button
              variant="secondary"
              size="sm"
              disabled={restarting}
              icon={<RefreshCw size={14} className={restarting ? 'animate-spin' : ''} />}
              onClick={() => void onRestart()}
            >
              {restarting ? 'Restarting…' : 'Restart two-bin test'}
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

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Mapping table</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            The two most recently updated rows stay at the top and are highlighted.
          </p>
        </div>
        <UwbDistanceTable />
      </section>
    </div>
  );
}
