import type { ReactNode } from 'react';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-grid min-h-dvh px-4 py-8 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-6 flex flex-col items-start gap-3 text-white">
          <img
            src="/aditya-birla-logo-retina.png"
            alt="Aditya Birla Group"
            className="h-14 w-auto rounded-xl bg-white object-contain p-2 shadow-lg sm:h-20"
          />
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand-yellow">Warehouse Intelligence</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/30 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 text-center text-sm text-slate-500">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
