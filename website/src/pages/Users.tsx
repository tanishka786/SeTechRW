import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Badge, statusVariant } from '../components/ui/Badge';
import { LogoutAction } from '../components/users/LogoutAction';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { useWarehouse } from '../context/WarehouseContext';
import type { SessionStatus } from '../types';

export function UsersPage() {
  const warehouse = useWarehouse();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SessionStatus | 'All'>('All');
  const [date, setDate] = useState('all');

  const dates = useMemo(() => ['all', ...Array.from(new Set(warehouse.userSessions.map((s) => s.date)))], [warehouse.userSessions]);

  const filtered = useMemo(
    () =>
      warehouse.userSessions.filter((session) => {
        const matchesQuery = `${session.userName} ${session.email} ${session.forkliftName}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesStatus = status === 'All' || session.status === status;
        const matchesDate = date === 'all' || session.date === date;
        return matchesQuery && matchesStatus && matchesDate;
      }),
    [date, query, status, warehouse.userSessions],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">User Login Activity</h2>
        <p className="text-sm text-slate-500">Track operator sessions against assigned forklifts</p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <SearchBar value={query} onChange={setQuery} placeholder="Search users, email, or machine" />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as SessionStatus | 'All')}
          options={[
            { value: 'All', label: 'All statuses' },
            { value: 'Active', label: 'Active' },
            { value: 'Logged Out', label: 'Logged Out' },
          ]}
          className="lg:w-44"
        />
        <Select
          value={date}
          onChange={(e) => setDate(e.target.value)}
          options={dates.map((d) => ({ value: d, label: d === 'all' ? 'All dates' : d }))}
          className="lg:w-48"
        />
      </div>

      <DataTable
        rows={filtered}
        rowKey={(row) => row.id}
        empty={<EmptyState icon={<Users />} title="No login activity" description="No sessions match the selected filters." />}
        columns={[
          { key: 'userName', header: 'User' },
          { key: 'email', header: 'Email' },
          { key: 'forkliftName', header: 'Forklift' },
          { key: 'loginTime', header: 'Login Time' },
          { key: 'logoutTime', header: 'Logout Time', render: (row) => row.logoutTime ?? '—' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
          },
          {
            key: 'action',
            header: 'Action',
            render: (row) => (
              <LogoutAction active={row.status === 'Active'} onLogout={() => warehouse.logoutSession(row.id)} />
            ),
          },
        ]}
      />
    </div>
  );
}
