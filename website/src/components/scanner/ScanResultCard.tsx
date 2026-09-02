import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import type { LookupResult, ScanRow } from '../../api/scanner';

export function ScanResultCard({
  code,
  codeType,
  result,
}: {
  code: string;
  codeType: ScanRow['codeType'];
  result: LookupResult | null;
}) {
  if (!result) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
        Scan a QR or barcode, or paste a URL from the Birla Carbon Excel file.
      </section>
    );
  }

  if (!result.found) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">{codeType}</p>
        <h3 className="mt-1 break-all font-semibold text-slate-900">{code}</h3>
        <p className="mt-3 text-sm text-rose-700">{result.error ?? 'No matching record found for this barcode / QR code.'}</p>
      </section>
    );
  }

  const catalog = result.catalog;
  const fields = catalog
    ? [
        ['Queue ID', catalog.queueId],
        ['Barcode', catalog.productRef],
        ['Product name', catalog.productName],
        ['Product type', catalog.productType || '—'],
        ['Weight', catalog.quantity ? `${catalog.quantity} kg` : '—'],
        ['Description', catalog.usp || '—'],
        ['QR / URL', catalog.qrValue],
        ['Queued at (UTC)', catalog.queuedAtUtc],
      ].filter(([, value]) => value && value !== '—')
    : [];

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success">Found</Badge>
        <Badge variant="accent">{codeType}</Badge>
      </div>
      <p className="mt-2 break-all font-mono text-xs text-slate-500">{code}</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">{result.matchedItem || catalog?.productName}</h3>
      {result.location ? <p className="text-sm text-slate-500">{result.location}</p> : null}

      {fields.length > 0 ? (
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-brand-yellow/20 px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-maroon">{label}</dt>
              <dd className="break-all text-sm text-slate-800">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {result.bin ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/bins" className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
            View Bin
          </Link>
        </div>
      ) : null}
    </section>
  );
}
