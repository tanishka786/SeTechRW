import { useState, type FormEvent } from 'react';
import { ImageUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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
      <h3 className="text-sm font-semibold text-slate-900">Manual entry</h3>
      <p className="mt-1 text-xs text-slate-500">Paste a QR URL, product ref, or queue ID from the Excel file.</p>
      <div className="mt-3">
        <Input
          label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="226587 or QR URL"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          Look up
        </Button>
        <label className="inline-flex">
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
          <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <ImageUp size={16} />
            Decode image
          </span>
        </label>
      </div>
    </form>
  );
}
