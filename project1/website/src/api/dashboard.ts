import { fetchWarehouse, type WarehouseResponse } from './warehouse';

export function fetchDashboardSummary() {
  return fetchWarehouse();
}

export type { WarehouseResponse };
