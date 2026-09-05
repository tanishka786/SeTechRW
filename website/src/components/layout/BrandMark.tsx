export function BrandMark({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Aditya Birla"
      className={`shrink-0 rounded-lg ${className}`.trim()}
    >
      <rect width="64" height="64" rx="12" fill="#991010" />
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fontSize="22"
        fontWeight="700"
        fill="#F5D34F"
        fontFamily="Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
      >
        AB
      </text>
    </svg>
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
