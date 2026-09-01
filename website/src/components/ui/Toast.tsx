import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(100%-2rem,360px)] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className="toast-enter pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-lg"
            role="status"
          >
            <Icon
              size={18}
              className={
                toast.type === 'success'
                  ? 'text-emerald-600'
                  : toast.type === 'error'
                    ? 'text-rose-600'
                    : 'text-brand-orange'
              }
            />
            <p className="flex-1 text-sm font-medium text-slate-800">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => dismissToast(toast.id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
