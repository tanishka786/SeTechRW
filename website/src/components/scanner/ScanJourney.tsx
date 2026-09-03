import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { placeScanRequest } from '../../api/scanner';
import { fetchUwbMapping } from '../../api/uwb';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useWarehouse } from '../../context/WarehouseContext';
import type { Bin, UwbMapping } from '../../types';
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
  atForklift: boolean;
}

const LIVE_MS = 20_000;

function isLiveMapping(row: UwbMapping) {
  return (
    row.status === 'ok' &&
    row.hops.some((hop) => hop.source === 'dwm3001c') &&
    Date.now() - new Date(row.updatedAt).getTime() < LIVE_MS
  );
}

function detectBinFromUwb(mappings: UwbMapping[], forkliftId: string | null) {
  const forThisMachine = mappings.filter((row) => {
    if (row.status !== 'ok') return false;
    if (forkliftId && row.forkliftId !== forkliftId) return false;
    return true;
  });
  const live = forThisMachine.filter(isLiveMapping);
  const pool = live.length > 0 ? live : forThisMachine;
  const nearest = [...pool].sort((a, b) => a.totalDistanceM - b.totalDistanceM)[0];
  if (!nearest) return null;
  return {
    binId: nearest.binId,
    distanceM: nearest.totalDistanceM,
    forkliftId: nearest.forkliftId,
    live: isLiveMapping(nearest),
  };
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
  const [detected, setDetected] = useState<{ binId: string; distanceM: number; live: boolean } | null>(null);
  const [pickBin, setPickBin] = useState(false);
  const [selectedBinId, setSelectedBinId] = useState('');
  const [manualBin, setManualBin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const forkliftId = useMemo(() => {
    const session = warehouse.userSessions.find(
      (row) => row.status === 'Active' && row.email === currentUser?.email,
    );
    return session?.forkliftId ?? warehouse.forklifts[0]?.id ?? null;
  }, [currentUser?.email, warehouse.forklifts, warehouse.userSessions]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchUwbMapping();
        if (cancelled) return;
        const next = new Map<string, number>();
        for (const row of data.mappings) {
          if (forkliftId && row.forkliftId !== forkliftId) continue;
          const current = next.get(row.binId);
          if (current === undefined || row.totalDistanceM < current) {
            next.set(row.binId, row.totalDistanceM);
          }
        }
        setDistances(next);
        const hit = detectBinFromUwb(data.mappings, forkliftId);
        setDetected(hit);
      } catch {
        if (!cancelled) setDistances(new Map());
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [forkliftId]);

  const suggested = useMemo(() => {
    const rows: SuggestedBin[] = warehouse.bins
      .filter((bin) => bin.status !== 'Maintenance' && binFreeKg(bin.capacity) >= journey.requiredKg)
      .map((bin) => ({
        bin,
        freeKg: binFreeKg(bin.capacity),
        distanceM: distances.get(bin.id) ?? null,
        atForklift: Boolean(detected?.live && detected.binId === bin.id),
      }));
    return rows.sort((a, b) => {
      if (a.atForklift !== b.atForklift) return a.atForklift ? -1 : 1;
      if (a.distanceM != null && b.distanceM != null && a.distanceM !== b.distanceM) {
        return a.distanceM - b.distanceM;
      }
      if (a.distanceM != null && b.distanceM == null) return -1;
      if (a.distanceM == null && b.distanceM != null) return 1;
      return a.bin.id.localeCompare(b.bin.id);
    });
  }, [detected?.binId, distances, journey.requiredKg, warehouse.bins]);

  const placeInBin = async (binId: string, source: 'uwb' | 'manual', distanceM?: number) => {
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
      setPickBin(false);
      onEnded();
      const where = formatBinId(placed.bin.id);
      pushToast(
        'success',
        source === 'uwb'
          ? `${journey.requiredKg} kg placed in ${where}${distanceM != null ? ` · UWB ${distanceM.toFixed(1)} m` : ''}`
          : `${journey.requiredKg} kg stored in ${where}`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to end the journey.');
      setPickBin(true);
    } finally {
      setSaving(false);
    }
  };

  const endJourney = async () => {
    setError('');
    setSaving(true);
    try {
      const data = await fetchUwbMapping();
      const hit = detectBinFromUwb(data.mappings, forkliftId);
      setDetected(hit);
      if (!hit?.live) {
        setSelectedBinId(suggested[0]?.bin.id ?? '');
        setManualBin('');
        setPickBin(true);
        setSaving(false);
        pushToast('error', 'Bring the tag laptop near Bin 1 or Bin 2 until live distance appears, then end journey.');
        return;
      }
      await placeInBin(hit.binId, 'uwb', hit.distanceM);
    } catch (err) {
      setSaving(false);
      setPickBin(true);
      setError(err instanceof ApiError ? err.message : 'Unable to read UWB position.');
    }
  };

  const confirmManual = async () => {
    const binId = manualBin.trim() ? toStorageBinId(manualBin) : selectedBinId;
    if (!binId) {
      setError('Select a bin or type a bin number');
      return;
    }
    await placeInBin(binId, 'manual');
  };

  const liveBin = detected ? warehouse.bins.find((bin) => bin.id === detected.binId) : null;

  return (
    <>
      <section className="flex h-full min-h-0 flex-col rounded-2xl border border-brand-orange/40 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-maroon">Journey in progress</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{journey.itemName}</h3>
            <p className="mt-1 text-sm text-slate-500">
              Drive to a bin. End journey uses UWB to detect where the forklift is and stores {journey.requiredKg} kg
              there.
            </p>
            {detected?.live && liveBin ? (
              <p className="mt-2 text-sm font-medium text-slate-800">
                Live UWB: {formatBinId(liveBin.id)} is closest · {detected.distanceM.toFixed(1)} m
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Waiting for live UWB from Bin 1 / Bin 2…</p>
            )}
          </div>
          <Button variant="danger" disabled={saving} onClick={() => void endJourney()}>
            {saving ? 'Detecting…' : 'End journey'}
          </Button>
        </div>

        {suggested.length === 0 ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            No bin currently has {journey.requiredKg} kg free in a {BIN_MAX_KG} kg bin.
          </p>
        ) : (
          <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {suggested.slice(0, 4).map((row) => (
              <li
                key={row.bin.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {formatBinId(row.bin.id)}
                    {row.atForklift ? (
                      <span className="ml-2 align-middle">
                        <Badge variant="success">Forklift here</Badge>
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
        {error && !pickBin ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>

      <Modal
        open={pickBin}
        title="Select a bin"
        description="UWB could not detect the forklift position. Choose the bin where the product was placed."
        onClose={() => !saving && setPickBin(false)}
        footer={
          <>
            <Button variant="outline" disabled={saving} onClick={() => setPickBin(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void confirmManual()}>
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
          hint="Used only if UWB detection is unavailable."
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </Modal>
    </>
  );
}
