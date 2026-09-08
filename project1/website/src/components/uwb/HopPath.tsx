import type { UwbHop } from '../../types';

export function HopPath({ hops, totalM, missing }: { hops: UwbHop[]; totalM: number; missing?: boolean }) {
  if (!hops[0] || missing || hops.length === 0) {
    return <span className="text-xs text-slate-400">No UWB signal</span>;
  }

  const nodes = [
    { id: hops[0].fromId, name: hops[0].fromName, role: hops[0].fromRole },
    ...hops.map((hop) => ({ id: hop.toId, name: hop.toName, role: hop.toRole })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      {nodes.map((node, index) => {
        const hop = hops[index];
        const tone =
          node.role === 'tag'
            ? 'bg-brand-orange/15 text-brand-orange'
            : node.role === 'primary'
              ? 'bg-black text-brand-yellow'
              : 'bg-slate-100 text-slate-700';
        return (
          <span key={`${node.id}-${index}`} className="flex items-center gap-1.5">
            <span className={`rounded-md px-1.5 py-0.5 font-medium ${tone}`}>{node.name}</span>
            {hop ? (
              <>
                <span className="font-semibold text-brand-maroon">{hop.distanceM.toFixed(2)} m</span>
                <span className="text-slate-400">→</span>
              </>
            ) : null}
          </span>
        );
      })}
      <span className="ml-1 font-semibold text-slate-900">= {totalM.toFixed(2)} m</span>
    </div>
  );
}
