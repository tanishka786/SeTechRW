import type { UwbDevice, UwbMapping } from '../../types';
import { formatBinId, formatMachineId } from '../../utils/validation';

const WIDTH = 720;
const HEIGHT = 420;
const MAX_X = 32;
const MAX_Y = 28;
const LIVE_MS = 20_000;

function sx(x: number) {
  return 36 + (x / MAX_X) * (WIDTH - 72);
}

function sy(y: number) {
  return 28 + (y / MAX_Y) * (HEIGHT - 56);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function placeFromAnchor(tag: UwbDevice, anchor: UwbDevice, distanceM: number) {
  let dx = tag.x - anchor.x;
  let dy = tag.y - anchor.y;
  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;
  const metres = clamp(distanceM, 0.6, 24);
  return {
    ...tag,
    x: clamp(anchor.x + dx * metres, 1, MAX_X - 1),
    y: clamp(anchor.y + dy * metres, 1, MAX_Y - 1),
  };
}

function devicesWithLiveTags(devices: UwbDevice[], mappings: UwbMapping[]) {
  const placed = new Map(devices.map((device) => [device.id, { ...device }]));
  for (const tag of devices.filter((device) => device.role === 'tag')) {
    const nearest = mappings
      .filter((row) => row.tagId === tag.id && row.status === 'ok' && row.hops[0])
      .sort((a, b) => a.totalDistanceM - b.totalDistanceM)[0];
    if (!nearest?.hops[0]) continue;
    const anchor = placed.get(nearest.hops[0].toId);
    if (!anchor) continue;
    placed.set(tag.id, placeFromAnchor(tag, anchor, nearest.hops[0].distanceM));
  }
  return [...placed.values()];
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
  const liveDevices = devicesWithLiveTags(devices, mappings);
  const nearest = mappings.filter(
    (row) => row.isNearest && row.status === 'ok' && (selectedForkliftId === 'all' || row.forkliftId === selectedForkliftId),
  );

  const visibleDevices = liveDevices.filter((device) => {
    if (device.role !== 'tag') return true;
    return selectedForkliftId === 'all' || device.forkliftId === selectedForkliftId;
  });

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full min-h-[280px] rounded-xl bg-slate-50">
        <rect x="16" y="12" width={WIDTH - 32} height={HEIGHT - 24} rx="16" fill="#f8fafc" stroke="#e2e8f0" />
        <text x="32" y="36" className="fill-slate-400" fontSize="11">
          Warehouse floor · tag moves as live distance updates (metres)
        </text>

        {nearest.map((row) => {
          const tag = liveDevices.find((d) => d.id === row.tagId);
          const hops = row.hops;
          if (!tag || hops.length === 0) return null;
          const nodes = [tag, ...hops.map((hop) => liveDevices.find((d) => d.id === hop.toId)).filter(Boolean)];
          const points = nodes.map((node) => `${sx(node!.x)},${sy(node!.y)}`);
          return (
            <g key={`${row.tagId}-${row.primaryId}`}>
              <polyline
                points={points.join(' ')}
                fill="none"
                stroke="#F68529"
                strokeWidth="2"
                strokeDasharray="6 4"
                opacity="0.85"
              />
              {hops.map((hop, index) => {
                const from = nodes[index];
                const to = nodes[index + 1];
                if (!from || !to) return null;
                return (
                  <text
                    key={`${hop.fromId}-${hop.toId}`}
                    x={(sx(from.x) + sx(to.x)) / 2}
                    y={(sy(from.y) + sy(to.y)) / 2 - 6}
                    textAnchor="middle"
                    fontSize="10"
                    className="fill-brand-maroon"
                  >
                    {hop.distanceM.toFixed(2)} m
                  </text>
                );
              })}
            </g>
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
                  {device.binId ? formatBinId(device.binId) : device.name.replace('Primary ', '')}
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
          const live = mappings.some(
            (row) =>
              row.tagId === device.id &&
              row.hops.some((hop) => hop.source === 'dwm3001c') &&
              Date.now() - new Date(row.updatedAt).getTime() < LIVE_MS,
          );
          return (
            <g key={device.id}>
              <circle cx={x} cy={y} r="8" fill="#F68529" stroke="#111" strokeWidth="1.5" />
              {live ? <circle cx={x} cy={y} r="12" fill="none" stroke="#F68529" strokeWidth="1.5" opacity="0.45" /> : null}
              <text x={x} y={y - 14} textAnchor="middle" fontSize="10" className="fill-slate-700">
                {device.forkliftId ? formatMachineId(device.forkliftId) : device.name.replace('Tag ', '')}
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
