import { api, apiQuery } from './client';

export interface CatalogRecord {
  queueId: string;
  productRef: string;
  productName: string;
  productCode: string;
  productType: string;
  quantity: number;
  price: number;
  usp: string;
  qrValue: string;
  queuedAtUtc: string;
  sourceSheet: string;
  rawRow: Record<string, unknown>;
}

export interface LookupResult {
  found: boolean;
  error?: string;
  catalog?: CatalogRecord | null;
  product?: {
    id: string;
    name: string;
    quantity: number;
    status: string;
    binId: string;
    category: string;
  } | null;
  bin?: {
    id: string;
    name: string;
    location: string;
    status: string;
    capacity: number;
  } | null;
  forklift?: {
    id: string;
    name: string;
    status: string;
    location: string;
    operator: string;
  } | null;
  matchedItem?: string;
  location?: string;
  scan?: { id: string; createdAt: string };
  scanStats?: { today: number; unmatchedToday: number };
}

export interface ScanRow {
  id: string;
  code: string;
  codeType: 'QR' | 'Barcode' | 'Manual' | 'Image';
  status: 'Found' | 'Not Found';
  matchedItem: string;
  location: string;
  productId?: string | null;
  binId?: string | null;
  createdAt: string;
}

export function lookupCodeRequest(code: string, codeType: ScanRow['codeType']) {
  return api<LookupResult>('/api/catalog/lookup', {
    method: 'POST',
    body: JSON.stringify({ code, codeType }),
  });
}

export function listScansRequest(query: string, status: string) {
  return api<ScanRow[]>(apiQuery('/api/scans', { q: query, status: status === 'all' ? undefined : status }));
}

export function placeScanRequest(payload: { scanId?: string; binId: string; weightKg: number; productId?: string | null }) {
  return api<{ bin: { id: string; name: string; location: string; status: string; capacity: number; freeKg: number } }>(
    '/api/scans/place',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function importExcelRequest(file: File) {
  const body = new FormData();
  body.append('file', file);
  return api<{ inserted: number; updated: number; unchanged: number; message: string }>('/api/import/excel', {
    method: 'POST',
    body,
  });
}
