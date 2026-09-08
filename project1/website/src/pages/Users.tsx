import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Badge, statusVariant } from '../components/ui/Badge';
import { LogoutAction } from '../components/users/LogoutAction';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { useWarehouse } from '../context/WarehouseContext';
import type { SessionStatus } from '../types';
import { cn } from '../utils/cn';
import { matchesSearch } from '../utils/validation';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function monthCells(view: Date) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(view.getFullYear(), view.getMonth(), day));
  }
  return cells;
}

function DateFilter({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = Boolean(value && value !== 'all');
  const [view, setView] = useState(() => (selected ? new Date(`${value}T00:00:00`) : new Date()));

  useEffect(() => {
    if (!open) return;
    setView(selected ? new Date(`${value}T00:00:00`) : new Date());
  }, [open, selected, value]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const todayKey = toDateKey(new Date());
  const monthLabel = view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm text-slate-900 outline-none transition hover:border-slate-300 focus-visible:border-brand-orange focus-visible:ring-4 focus-visible:ring-brand-orange/15"
      >
        <Calendar size={16} className="mr-2 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate">{selected ? formatDateLabel(value) : 'All dates'}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute right-0 z-30 mt-2 w-[18.5rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold text-slate-900">{monthLabel}</p>
            <button
              type="button"
              aria-label="Next month"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthCells(view).map((cell, index) => {
              if (!cell) return <span key={`empty-${index}`} />;
              const key = toDateKey(cell);
              const isSelected = key === value;
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={cn(
                    'h-8 rounded-lg text-sm font-medium transition',
                    isSelected
                      ? 'bg-brand-orange text-white'
                      : isToday
                        ? 'bg-brand-yellow/40 text-brand-maroon'
                        : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => {
              onChange('all');
              setOpen(false);
            }}
          >
            All dates
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function UsersPage() {
  const warehouse = useWarehouse();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SessionStatus | 'All'>('All');
  const [date, setDate] = useState('all');

  const filtered = useMemo(
    () =>
      warehouse.userSessions.filter((session) => {
        const matchesQuery = matchesSearch(`${session.userName} ${session.email} ${session.forkliftName}`, query);
        const matchesStatus = status === 'All' || session.status === status;
        const matchesDate = date === 'all' || session.date.slice(0, 10) === date;
        return matchesQuery && matchesStatus && matchesDate;
      }),
    [date, query, status, warehouse.userSessions],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center gap-2 sm:gap-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search users, email, or machine" />
        <div className="w-32 shrink-0 sm:w-44">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as SessionStatus | 'All')}
            options={[
              { value: 'All', label: 'All statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'Logged Out', label: 'Logged Out' },
            ]}
          />
        </div>
        <DateFilter value={date} onChange={setDate} className="w-36 shrink-0 sm:w-52" />
      </div>

      <DataTable
        rows={filtered}
        resetKey={`${query}-${status}-${date}`}
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
