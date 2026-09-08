export function BrandMark({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/aditya-birla-logo-retina.png"
      alt="Aditya Birla Carbon"
      width={size}
      height={size}
      className={`shrink-0 rounded-lg bg-white object-contain ${className}`.trim()}
    />
  );
}

export function BrandWordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${inverted ? 'text-brand-yellow' : 'text-brand-maroon'}`}>
        Aditya Birla
      </p>
      <p className={`text-base font-bold tracking-tight ${inverted ? 'text-white' : 'text-slate-900'}`}>
        Birla Carbon
      </p>
    </div>
  );
}
