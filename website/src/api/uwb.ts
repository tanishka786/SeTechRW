import { api } from './client';
import type { UwbMappingResponse } from '../types';

export function fetchUwbMapping() {
  return api<UwbMappingResponse>('/api/uwb/mapping');
}
