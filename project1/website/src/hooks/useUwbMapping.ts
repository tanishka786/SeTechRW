import { useEffect, useState } from 'react';
import { fetchUwbMapping, restartUwbTest, setUwbTestCase, updateUwbDistance } from '../api/uwb';
import { ApiError } from '../api/client';
import type { UwbMapping, UwbMappingResponse } from '../types';

export function useUwbMapping() {
  const [data, setData] = useState<UwbMappingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const next = await fetchUwbMapping();
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Unable to load UWB mapping.');
        }
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const saveDistance = async (row: UwbMapping, distanceM: number) => {
    const next = await updateUwbDistance(row.tagId, row.primaryId, distanceM);
    setData(next);
    setError(null);
    return next;
  };

  const changeTestCase = async (testCase: 'A' | 'C') => {
    setData(await setUwbTestCase(testCase));
    setError(null);
  };

  const restartTest = async () => {
    const next = await restartUwbTest();
    setData(next);
    setError(null);
    return next;
  };

  return { data, error, setData, setError, saveDistance, changeTestCase, restartTest };
}
