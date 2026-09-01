import type { UwbDevice, UwbMapping } from '../../types';

const WIDTH = 720;
const HEIGHT = 420;
const MAX_X = 32;
const MAX_Y = 28;

function sx(x: number) {
  return 36 + (x / MAX_X) * (WIDTH - 72);
}

function sy(y: number) {
  return 28 + (y / MAX_Y) * (HEIGHT - 56);
}

export function UwbFloorMap({
  devices,
  mappings,
  selectedForkliftId,
}: {
  devices: UwbDevice[];
  mappings: UwbMapping[];
  selectedForkliftId: string;
}) {
  const nearest = mappings.filter(
    (row) => row.isNearest && row.status === 'ok' && (selectedForkliftId === 'all' || row.forkliftId === selectedForkliftId),
  );

  const visibleDevices = devices.filter((device) => {
    if (device.role !== 'tag') return true;
    return selectedForkliftId === 'all' || device.forkliftId === selectedForkliftId;
  });

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full min-h-[280px] rounded-xl bg-slate-50">
        <rect x="16" y="12" width={WIDTH - 32} height={HEIGHT - 24} rx="16" fill="#f8fafc" stroke="#e2e8f0" />
        <text x="32" y="36" className="fill-slate-400" fontSize="11">
          Warehouse floor · metres
        </text>

        {nearest.map((row) => {
          const tag = devices.find((d) => d.id === row.tagId);
          const hops = row.hops;
          if (!tag || hops.length === 0) return null;
          const points = [
            `${sx(tag.x)},${sy(tag.y)}`,
            ...hops.map((hop) => {
              const to = devices.find((d) => d.id === hop.toId);
              return to ? `${sx(to.x)},${sy(to.y)}` : '';
            }),
          ].filter(Boolean);
          return (
            <polyline
              key={`${row.tagId}-${row.primaryId}`}
              points={points.join(' ')}
              fill="none"
              stroke="#F68529"
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.85"
            />
          );
        })}

        {visibleDevices.map((device) => {
          const x = sx(device.x);
          const y = sy(device.y);
          if (device.role === 'primary') {
            return (
              <g key={device.id}>
                <rect x={x - 10} y={y - 10} width="20" height="20" rx="4" fill="#991010" />
                <text x={x} y={y + 24} textAnchor="middle" fontSize="10" className="fill-slate-600">
                  {device.name.replace('Primary ', '')}
                </text>
              </g>
            );
          }
          if (device.role === 'secondary') {
            return (
              <g key={device.id}>
                <polygon points={`${x},${y - 11} ${x + 11},${y} ${x},${y + 11} ${x - 11},${y}`} fill="#E7C845" stroke="#991010" />
                <text x={x} y={y + 24} textAnchor="middle" fontSize="10" className="fill-slate-600">
                  {device.name.replace('Secondary ', '')}
                </text>
              </g>
            );
          }
          return (
            <g key={device.id}>
              <circle cx={x} cy={y} r="8" fill="#F68529" stroke="#111" strokeWidth="1.5" />
              <text x={x} y={y - 14} textAnchor="middle" fontSize="10" className="fill-slate-700">
                {device.name.replace('Tag ', '')}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-brand-orange" /> Forklift tag
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rotate-45 bg-brand-gold" /> Secondary anchor
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-brand-maroon" /> Bin primary anchor
        </span>
        <span className="flex items-center gap-2">
          <span className="h-px w-6 border-t-2 border-dashed border-brand-orange" /> Nearest mapped path
        </span>
      </div>
    </div>
  );
}
