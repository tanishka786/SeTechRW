import { useCallback, useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraScanner } from '../components/scanner/CameraScanner';
import { ManualCodeForm } from '../components/scanner/ManualCodeForm';
import { RecentScansTable } from '../components/scanner/RecentScansTable';
import { ScanJourney, type ScanJourneyState } from '../components/scanner/ScanJourney';
import { ScanResultCard } from '../components/scanner/ScanResultCard';
import { ErrorState } from '../components/ui/LoadingState';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../api/client';
import { listScansRequest, lookupCodeRequest, type LookupResult, type ScanRow } from '../api/scanner';
import { useWarehouse } from '../context/WarehouseContext';
import { requiredWeightKg } from '../utils/bins';

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    window.navigator.vibrate?.(80);
  } catch {
    /* ignore audio errors */
  }
}

export function Scanner() {
  const { pushToast } = useToast();
  const warehouse = useWarehouse();
  const [result, setResult] = useState<LookupResult | null>(null);
  const [lastCode, setLastCode] = useState('');
  const [lastType, setLastType] = useState<ScanRow['codeType']>('Manual');
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journey, setJourney] = useState<ScanJourneyState | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setScans(await listScansRequest(query, status));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the warehouse database. Please try again.');
    }
  }, [query, status]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const lookup = async (code: string, codeType: ScanRow['codeType']) => {
    const trimmed = code.trim();
    if (!trimmed) {
      pushToast('error', 'Please enter or scan a valid code');
      return;
    }
    setBusy(true);
    setLastCode(trimmed);
    setLastType(codeType);
    try {
      const data = await lookupCodeRequest(trimmed, codeType);
      setResult(data);
      if (data.found) {
        beep();
        pushToast('success', `Matched ${data.matchedItem || trimmed}`);
        setJourney({
          scanId: data.scan?.id,
          itemName: data.matchedItem || data.catalog?.productName || trimmed,
          requiredKg: requiredWeightKg(data.catalog?.quantity ?? data.product?.quantity),
          productId: data.product?.id ?? null,
        });
      } else {
        pushToast('error', data.error ?? 'No matching record found for this barcode / QR code.');
      }
      if (data.scanStats) warehouse.applyScanStats(data.scanStats);
      await Promise.all([loadHistory(), warehouse.refresh()]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to reach the warehouse database. Please try again.';
      setError(message);
      pushToast('error', message);
    } finally {
      setBusy(false);
    }
  };

  const decodeImage = async (file: File) => {
    setBusy(true);
    try {
      const scanner = new Html5Qrcode('forklift-file-scanner');
      const decoded = await scanner.scanFile(file, true);
      await scanner.clear();
      await lookup(decoded, 'Image');
    } catch {
      pushToast('error', 'Could not read a barcode or QR code from that image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <ErrorState title="Database unavailable" message={error} /> : null}
      {journey ? <ScanJourney journey={journey} onEnded={() => setJourney(null)} /> : null}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <CameraScanner busy={busy} onScan={(code, type) => void lookup(code, type)} />
          <ManualCodeForm busy={busy} onLookup={(code) => void lookup(code, 'Manual')} onImage={(file) => void decodeImage(file)} />
        </div>
        <ScanResultCard code={lastCode} codeType={lastType} result={result} />
      </div>
      <div id="forklift-file-scanner" className="hidden" />
      <RecentScansTable
        rows={scans}
        query={query}
        onQuery={setQuery}
        status={status}
        onStatus={setStatus}
        onReplay={(code) => void lookup(code, 'Manual')}
      />
    </div>
  );
}
