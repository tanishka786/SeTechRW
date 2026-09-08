import { Search } from 'lucide-react';
import type { ScanRow } from '../../api/scanner';
import { Badge } from '../ui/Badge';
import { DataTable } from '../ui/DataTable';
import { EmptyState } from '../ui/EmptyState';
import { SearchBar } from '../ui/SearchBar';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

export function RecentScansTable({
  rows,
  query,
  onQuery,
  status,
  onStatus,
  onReplay,
}: {
  rows: ScanRow[];
  query: string;
  onQuery: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  onReplay: (code: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-row items-center gap-2 sm:gap-3">
        <SearchBar value={query} onChange={onQuery} placeholder="Search scan history" />
        <div className="w-32 shrink-0 sm:w-44">
          <Select
            value={status}
            onChange={(e) => onStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'Found', label: 'Found' },
              { value: 'Not Found', label: 'Not Found' },
            ]}
          />
        </div>
      </div>
      <DataTable
        rows={rows}
        resetKey={`${query}-${status}`}
        rowKey={(row) => row.id}
        empty={<EmptyState icon={<Search />} title="No scans yet" description="Scan a label or enter a product ref from the Excel file." />}
        columns={[
          {
            key: 'serial',
            header: 'Serial No.',
            className: 'w-24',
            render: (_row, index) => index + 1,
          },
          {
            key: 'time',
            header: 'Time',
            render: (row) => new Date(row.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          },
          { key: 'code', header: 'Code', render: (row) => <span className="max-w-[180px] truncate font-mono text-xs">{row.code}</span> },
          { key: 'codeType', header: 'Type' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <Badge variant={row.status === 'Found' ? 'success' : 'danger'}>{row.status}</Badge>,
          },
          { key: 'matchedItem', header: 'Matched item', render: (row) => row.matchedItem || '—' },
          { key: 'location', header: 'Location / Bin', render: (row) => row.location || row.binId || '—' },
          {
            key: 'action',
            header: 'Action',
            render: (row) => (
              <Button size="sm" variant="outline" onClick={() => onReplay(row.code)}>
                Lookup
              </Button>
            ),
          },
        ]}
      />
    </section>
  );
}
