import type { LookupResult, ScanRow } from '../../api/scanner';
import type { ScanJourneyState } from './ScanJourney';

export const OPEN_SCAN_KEY = 'forklift-open-scan-journey';

export interface OpenScanSession {
  journey: ScanJourneyState;
  result: LookupResult;
  lastCode: string;
  lastType: ScanRow['codeType'];
}

export function readOpenScanSession(): OpenScanSession | null {
  try {
    const raw = window.sessionStorage.getItem(OPEN_SCAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OpenScanSession;
    if (!parsed?.journey?.itemName || !parsed.result) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeOpenScanSession(value: OpenScanSession | null) {
  try {
    if (!value) window.sessionStorage.removeItem(OPEN_SCAN_KEY);
    else window.sessionStorage.setItem(OPEN_SCAN_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function clearOpenScanSession() {
  writeOpenScanSession(null);
}
