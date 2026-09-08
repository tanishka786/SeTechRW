import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecentScansTable } from '../components/scanner/RecentScansTable';
import { ErrorState } from '../components/ui/LoadingState';
import { ApiError } from '../api/client';
import { listScansRequest, type ScanRow } from '../api/scanner';

export function ScanHistory() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setScans(await listScansRequest(query, status));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the warehouse database. Please try again.');
    }
  }, [query, status]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <div className="space-y-6">
      {error ? <ErrorState title="Database unavailable" message={error} /> : null}
      <RecentScansTable
        rows={scans}
        query={query}
        onQuery={setQuery}
        status={status}
        onStatus={setStatus}
        onReplay={(code) => navigate(`/scanner?code=${encodeURIComponent(code)}`)}
      />
    </div>
  );
}
