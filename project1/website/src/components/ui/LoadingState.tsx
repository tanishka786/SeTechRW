export function LoadingState({ label = 'Loading warehouse data' }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-slate-500" role="status">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-orange" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-8 text-center">
      <h3 className="font-semibold text-rose-800">{title}</h3>
      <p className="mt-1 text-sm text-rose-600">{message}</p>
    </div>
  );
}
