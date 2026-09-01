import { useEffect } from 'react';
import type { WarehouseState } from '../types';
import { LIVE_EVENT_POOL } from '../data/mockData';
import { clamp, deriveProductStatus, formatTime } from '../utils/formatters';

function tick(prev: WarehouseState): WarehouseState {
  const forklifts = prev.forklifts.map((f) => {
    if (f.status === 'Offline' || f.status === 'Maintenance') {
      return { ...f, battery: clamp(f.battery - 0.2, 8, 100) };
    }
    const drift = f.status === 'Active' ? -1.1 : -0.3;
    const nextBattery = clamp(f.battery + drift + (Math.random() * 0.6 - 0.2), 12, 98);
    const locations = prev.bins.map((b) => b.name);
    const maybeMove = f.status === 'Active' && Math.random() > 0.72;
    const nextLocation =
      maybeMove && locations.length > 0
        ? locations[Math.floor(Math.random() * locations.length)] ?? f.location
        : f.location;
    return {
      ...f,
      battery: Math.round(nextBattery),
      location: nextLocation,
      lastActive: f.status === 'Active' ? new Date().toISOString() : f.lastActive,
    };
  });

  const products = prev.products.map((p, index) => {
    if (index % 4 !== Math.floor(Date.now() / 4000) % 4) return p;
    const quantity = Math.max(0, p.quantity + Math.round(Math.random() * 4 - 1.5));
    return {
      ...p,
      quantity,
      status: deriveProductStatus(quantity, p.status),
      lastUpdated: new Date().toISOString(),
    };
  });

  const nextHistory = [...prev.inventoryHistory];
  const last = nextHistory[nextHistory.length - 1];
  nextHistory.push({
    time: formatTime(),
    quantity: Math.max(18000, (last?.quantity ?? 24000) + Math.round(Math.random() * 80 - 25)),
    inbound: 20 + Math.round(Math.random() * 50),
    outbound: 15 + Math.round(Math.random() * 45),
    activity: 8 + Math.round(Math.random() * 20),
  });
  if (nextHistory.length > 14) nextHistory.shift();

  let events = prev.events;
  if (Math.random() > 0.45) {
    const sample = LIVE_EVENT_POOL[Math.floor(Math.random() * LIVE_EVENT_POOL.length)];
    if (sample) {
      events = [
        {
          id: `evt-${Date.now()}`,
          time: formatTime(),
          timestamp: Date.now(),
          type: sample.type,
          message: sample.message,
        },
        ...events,
      ].slice(0, 14);
    }
  }

  const bins = prev.bins.map((bin) => ({
    ...bin,
    productCount: products.filter((p) => p.binId === bin.id).length,
  }));

  return {
    ...prev,
    forklifts,
    products,
    bins,
    inventoryHistory: nextHistory,
    events,
    lastUpdated: new Date().toISOString(),
  };
}

export function useLiveData(
  livePaused: boolean,
  setState: (updater: (prev: WarehouseState) => WarehouseState) => void,
) {
  useEffect(() => {
    if (livePaused) return;
    const timer = window.setInterval(() => {
      setState(tick);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [livePaused, setState]);
}
