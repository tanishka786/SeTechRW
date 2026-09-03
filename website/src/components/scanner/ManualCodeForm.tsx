import { useState, type FormEvent } from 'react';
import { ImageUp } from 'lucide-react';
import { Button } from '../ui/Button';

export function ManualCodeForm({
  onLookup,
  onImage,
  busy,
}: {
  onLookup: (code: string) => void;
  onImage: (file: File) => void;
  busy: boolean;
}) {
  const [code, setCode] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onLookup(code);
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Manual entry</h3>
          <p className="text-xs text-slate-500">Enter a barcode or paste a QR URL from the Excel file.</p>
        </div>
      </div>
      <div className="mt-3 flex min-w-0 flex-row items-center gap-2">
        <input
          aria-label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code, barcode, or QR URL"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15"
        />
        <Button type="submit" disabled={busy} className="shrink-0 whitespace-nowrap">
          Look up
        </Button>
        <label className="inline-flex shrink-0">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImage(file);
              e.target.value = '';
            }}
          />
          <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:px-4">
            <ImageUp size={16} />
            Decode image
          </span>
        </label>
      </div>
    </form>
  );
}
