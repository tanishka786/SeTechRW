import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { placeScanRequest } from '../../api/scanner';
import { fetchUwbMapping } from '../../api/uwb';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useWarehouse } from '../../context/WarehouseContext';
import type { Bin } from '../../types';
import { BIN_MAX_KG, binFreeKg } from '../../utils/bins';
import { formatBinId, toStorageBinId } from '../../utils/validation';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';

export interface ScanJourneyState {
  scanId?: string;
  itemName: string;
  requiredKg: number;
  productId?: string | null;
}

interface SuggestedBin {
  bin: Bin;
  freeKg: number;
  distanceM: number | null;
}

export function ScanJourney({
  journey,
  onEnded,
}: {
  journey: ScanJourneyState;
  onEnded: () => void;
}) {
  const warehouse = useWarehouse();
  const { currentUser } = useAuth();
  const { pushToast } = useToast();
  const [distances, setDistances] = useState<Map<string, number>>(new Map());
  const [ending, setEnding] = useState(false);
  const [selectedBinId, setSelectedBinId] = useState('');
  const [manualBin, setManualBin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchUwbMapping()
      .then((data) => {
        if (cancelled) return;
        const session = warehouse.userSessions.find(
          (row) => row.status === 'Active' && row.email === currentUser?.email,
        );
        const forkliftId = session?.forkliftId;
        const next = new Map<string, number>();
        for (const row of data.mappings) {
          if (forkliftId && row.forkliftId !== forkliftId) continue;
          const current = next.get(row.binId);
          if (current === undefined || row.totalDistanceM < current) {
            next.set(row.binId, row.totalDistanceM);
          }
        }
        setDistances(next);
      })
      .catch(() => {
        if (!cancelled) setDistances(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.email, warehouse.userSessions]);

  const suggested = useMemo(() => {
    const rows: SuggestedBin[] = warehouse.bins
      .filter((bin) => bin.status !== 'Maintenance' && binFreeKg(bin.capacity) >= journey.requiredKg)
      .map((bin) => ({
        bin,
        freeKg: binFreeKg(bin.capacity),
        distanceM: distances.get(bin.id) ?? null,
      }));
    return rows.sort((a, b) => {
      if (a.distanceM != null && b.distanceM != null && a.distanceM !== b.distanceM) {
        return a.distanceM - b.distanceM;
      }
      if (a.distanceM != null && b.distanceM == null) return -1;
      if (a.distanceM == null && b.distanceM != null) return 1;
      return a.bin.id.localeCompare(b.bin.id);
    });
  }, [distances, journey.requiredKg, warehouse.bins]);

  const nearestId = suggested[0]?.bin.id;

  const openEnd = () => {
    setSelectedBinId(nearestId ?? '');
    setManualBin('');
    setError('');
    setEnding(true);
  };

  const confirmEnd = async () => {
    const binId = manualBin.trim() ? toStorageBinId(manualBin) : selectedBinId;
    if (!binId) {
      setError('Select a bin or type a bin number');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const placed = await placeScanRequest({
        scanId: journey.scanId,
        productId: journey.productId,
        binId,
        weightKg: journey.requiredKg,
      });
      await warehouse.refresh();
      setEnding(false);
      onEnded();
      pushToast('success', `${journey.requiredKg} kg stored in ${formatBinId(placed.bin.id)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to end the journey.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-brand-orange/40 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-maroon">Journey in progress</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{journey.itemName}</h3>
            <p className="mt-1 text-sm text-slate-500">
              Needs {journey.requiredKg} kg. Showing bins that still have enough free space in a {BIN_MAX_KG} kg bin.
            </p>
          </div>
          <Button variant="danger" onClick={openEnd}>
            End journey
          </Button>
        </div>

        {suggested.length === 0 ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            No bin currently has {journey.requiredKg} kg free. End the journey and pick a bin manually if you stored it
            anyway.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {suggested.map((row, index) => (
              <li
                key={row.bin.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {formatBinId(row.bin.id)}
                    {index === 0 ? (
                      <span className="ml-2 align-middle">
                        <Badge variant="success">Nearest</Badge>
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">{row.bin.location}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-slate-800">{row.freeKg} kg free</p>
                  <p className="flex items-center justify-end gap-1 text-xs text-slate-500">
                    <MapPin size={12} />
                    {row.distanceM != null ? `${row.distanceM.toFixed(1)} m` : 'Distance n/a'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={ending}
        title="Where did you keep it?"
        description={`Record the bin that received ${journey.requiredKg} kg of ${journey.itemName}.`}
        onClose={() => !saving && setEnding(false)}
        footer={
          <>
            <Button variant="outline" disabled={saving} onClick={() => setEnding(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void confirmEnd()}>
              {saving ? 'Saving' : 'Confirm'}
            </Button>
          </>
        }
      >
        <Select
          label="Select bin"
          value={selectedBinId}
          onChange={(e) => setSelectedBinId(e.target.value)}
          options={[
            { value: '', label: 'Choose a bin' },
            ...warehouse.bins.map((bin) => ({
              value: bin.id,
              label: `${formatBinId(bin.id)} · ${binFreeKg(bin.capacity)} kg free · ${bin.status}`,
            })),
          ]}
        />
        <Input
          label="Or enter bin manually"
          placeholder="Bin 4"
          value={manualBin}
          onChange={(e) => setManualBin(e.target.value)}
          hint="Type Bin 4 or BIN-004. Manual entry is used if filled."
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </Modal>
    </>
  );
}
