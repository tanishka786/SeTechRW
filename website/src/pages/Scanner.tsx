import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { CameraScanner } from '../components/scanner/CameraScanner';
import { ManualCodeForm } from '../components/scanner/ManualCodeForm';
import { ScanJourney, type ScanJourneyState } from '../components/scanner/ScanJourney';
import { ScanResultCard } from '../components/scanner/ScanResultCard';
import { readOpenScanSession, writeOpenScanSession } from '../components/scanner/openScanSession';
import { ErrorState } from '../components/ui/LoadingState';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../api/client';
import { lookupCodeRequest, type LookupResult, type ScanRow } from '../api/scanner';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const replayed = useRef('');
  const restored = useRef(readOpenScanSession());
  const [result, setResult] = useState<LookupResult | null>(restored.current?.result ?? null);
  const [lastCode, setLastCode] = useState(restored.current?.lastCode ?? '');
  const [lastType, setLastType] = useState<ScanRow['codeType']>(restored.current?.lastType ?? 'Manual');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journey, setJourney] = useState<ScanJourneyState | null>(restored.current?.journey ?? null);

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
      if (data.found) {
        beep();
        pushToast('success', `Matched ${data.matchedItem || trimmed}`);
        const nextJourney: ScanJourneyState = {
          scanId: data.scan?.id,
          itemName: data.matchedItem || data.catalog?.productName || trimmed,
          requiredKg: requiredWeightKg(data.catalog?.quantity ?? data.product?.quantity),
          productId: data.product?.id ?? null,
        };
        setResult(data);
        setJourney(nextJourney);
        writeOpenScanSession({
          journey: nextJourney,
          result: data,
          lastCode: trimmed,
          lastType: codeType,
        });
      } else {
        pushToast('error', data.error ?? 'No matching record found for this barcode / QR code.');
      }
      if (data.scanStats) warehouse.applyScanStats(data.scanStats);
      await warehouse.refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to reach the warehouse database. Please try again.';
      setError(message);
      pushToast('error', message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const code = searchParams.get('code')?.trim();
    if (!code || replayed.current === code) return;
    replayed.current = code;
    setSearchParams({}, { replace: true });
    void lookup(code, 'Manual');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  const scanned = Boolean(result);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {error ? <ErrorState title="Database unavailable" message={error} /> : null}

      <ManualCodeForm busy={busy} onLookup={(code) => void lookup(code, 'Manual')} onImage={(file) => void decodeImage(file)} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex min-h-0 flex-col lg:col-span-8">
          {result ? (
            <ScanResultCard code={lastCode} codeType={lastType} result={result} />
          ) : (
            <section className="flex h-full min-h-[16rem] flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-brand-yellow">
                <ScanLine size={26} />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Ready to scan</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Use live scanner or enter a barcode. Matching Excel data will appear here after a successful scan.
              </p>
            </section>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-4 lg:col-span-4">
          <div className={scanned && journey ? 'shrink-0' : 'min-h-0 flex-1'}>
            <CameraScanner
              busy={busy}
              compact={scanned}
              onScan={(code, type) => void lookup(code, type)}
            />
          </div>
          {journey ? (
            <div className="min-h-0 flex-1">
              <ScanJourney
                journey={journey}
                onEnded={() => {
                  setJourney(null);
                  writeOpenScanSession(null);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
      <div id="forklift-file-scanner" className="hidden" />
    </div>
  );
}
