import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Flashlight, FlashlightOff, Video } from 'lucide-react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import type { ScanRow } from '../../api/scanner';

const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
];

function classify(value: string): ScanRow['codeType'] {
  return /^https?:\/\//i.test(value) ? 'QR' : 'Barcode';
}

export function CameraScanner({
  onScan,
  busy,
  compact = false,
}: {
  onScan: (code: string, type: ScanRow['codeType']) => void;
  busy: boolean;
  compact?: boolean;
}) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [cameraId, setCameraId] = useState('');
  const [running, setRunning] = useState(false);
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastRef = useRef({ code: '', at: 0 });

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices.map((d) => ({ id: d.id, label: d.label || d.id })));
        const rear = devices.find((d) => /back|rear|environment/i.test(d.label));
        setCameraId(rear?.id ?? devices[0]?.id ?? '');
      })
      .catch(() => {
        setError('Camera permission is blocked. Use manual entry.');
      });
    return () => {
      const scanner = scannerRef.current;
      if (scanner?.isScanning) {
        scanner.stop().catch(() => undefined);
      }
    };
  }, []);

  const stop = async () => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) await scanner.stop();
    setRunning(false);
    setTorch(false);
  };

  const start = async () => {
    setError('');
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('forklift-scanner', {
          verbose: false,
          formatsToSupport: FORMATS,
        });
      }
      const scanner = scannerRef.current;
      if (scanner.isScanning) await scanner.stop();
      await scanner.start(
        cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 140, height: 140 } },
        (decoded) => {
          const now = Date.now();
          if (decoded === lastRef.current.code && now - lastRef.current.at < 2500) return;
          lastRef.current = { code: decoded, at: now };
          if (!busy) onScan(decoded, classify(decoded));
        },
        () => undefined,
      );
      setRunning(true);
    } catch {
      setError('Camera permission is blocked. Use manual entry.');
      setRunning(false);
    }
  };

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner?.isScanning) return;
    try {
      await scanner.applyVideoConstraints({
        advanced: [{ torch: !torch }],
      } as unknown as MediaTrackConstraints);
      setTorch((v) => !v);
    } catch {
      setError('Torch is not supported on this camera.');
    }
  };

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Live scanner</h3>
        <span className="text-xs text-slate-500">{running ? 'Camera on' : 'Camera off'}</span>
      </div>
      <div
        id="forklift-scanner"
        className="forklift-scanner h-36 w-full shrink-0 overflow-hidden rounded-xl bg-slate-950"
      />
      {cameras.length > 1 ? (
        <div className="mt-3">
          <Select
            label="Camera"
            value={cameraId}
            onChange={(e) => setCameraId(e.target.value)}
            options={cameras.map((c) => ({ value: c.id, label: c.label }))}
          />
        </div>
      ) : null}
      {error ? <p className="mt-3 text-xs leading-5 text-rose-600">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {running ? (
          <Button variant="outline" size="sm" onClick={() => void stop()}>
            Stop camera
          </Button>
        ) : (
          <Button size="sm" onClick={() => void start()} icon={<Video size={16} />}>
            Start camera
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void toggleTorch()}
          disabled={!running}
          icon={torch ? <FlashlightOff size={16} /> : <Flashlight size={16} />}
        >
          {torch ? 'Torch off' : 'Torch'}
        </Button>
      </div>
      {!compact ? (
        <p className="mt-auto pt-4 text-xs leading-5 text-slate-500">
          Point the tablet camera at a barcode or QR label. Matching Excel data opens on the left.
        </p>
      ) : null}
    </section>
  );
}
