import { api } from './client';
import type { UwbMappingResponse } from '../types';

export function fetchUwbMapping() {
  return api<UwbMappingResponse>('/api/uwb/mapping');
}

export function updateUwbDistance(tagId: string, primaryId: string, distanceM: number) {
  return api<UwbMappingResponse>('/api/uwb/mapping', {
    method: 'PATCH',
    body: JSON.stringify({ tagId, primaryId, distanceM }),
  });
}

export function setUwbTestCase(testCase: 'A' | 'C') {
  return api<UwbMappingResponse>('/api/uwb/test-case', {
    method: 'POST',
    body: JSON.stringify({ testCase }),
  });
}

export function restartUwbTest() {
  return api<UwbMappingResponse>('/api/uwb/restart', { method: 'POST' });
}
