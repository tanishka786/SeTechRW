import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarClock, CheckCircle2, Phone, Search, AlertTriangle, Clock } from 'lucide-react'
import { crmApi, usersApi } from '../../api'
import { fmtDateTime, followUpTypeLabel, leadStatusLabel, leadStatusColor } from '../../utils/format'
import { FollowUpType } from '../../types'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import LeadDetail from './components/LeadDetail'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

const SCOPES = [
  { id: 'today', label: 'Today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'all', label: 'All' },
] as const

export default function FollowUpsPage() {
  const qc = useQueryClient()
  const canViewAll = useAuthStore(s => s.canViewAllLeads())
  const [scope, setScope] = useState<string>('today')
  const [search, setSearch] = useState('')
  const [assignee, setAssignee] = useState('')
  const [viewLeadId, setViewLeadId] = useState<string | null>(null)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState('')

  const { data: stats } = useQuery({ queryKey: ['followup-stats'], queryFn: crmApi.followUpStats })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.list, enabled: canViewAll })
  const { data, isLoading } = useQuery({
    queryKey: ['followups', scope, search, assignee],
    queryFn: () => crmApi.followUps({
      scope,
      searchTerm: search || undefined,
      assignedToUserId: assignee || undefined,
      pageNumber: 1,
      pageSize: 100,
    }),
    placeholderData: p => p,
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: string }) => crmApi.completeFollowUp(id, { outcome }),
    onSuccess: () => {
      toast.success('Follow-up completed')
      setCompletingId(null)
      setOutcome('')
      qc.invalidateQueries({ queryKey: ['followups'] })
      qc.invalidateQueries({ queryKey: ['followup-stats'] })
      qc.invalidateQueries({ queryKey: ['crm-due-followups'] })
    },
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['followups'] })
    qc.invalidateQueries({ queryKey: ['followup-stats'] })
    qc.invalidateQueries({ queryKey: ['leads'] })
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Follow-ups</h1>
          <p className="text-sm text-gray-500">Track today’s calls, visits, and overdue actions</p>
        </div>
        <Link to="/crm" className="text-sm text-amber-700 hover:underline">← Back to Leads</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={CalendarClock} label="Due Today" value={stats?.dueToday ?? 0} color="bg-amber-50 text-amber-700" active={scope === 'today'} onClick={() => setScope('today')} />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats?.overdue ?? 0} color="bg-red-50 text-red-700" active={scope === 'overdue'} onClick={() => setScope('overdue')} />
        <StatCard icon={Clock} label="Upcoming" value={stats?.upcoming ?? 0} color="bg-blue-50 text-blue-700" active={scope === 'upcoming'} onClick={() => setScope('upcoming')} />
        <StatCard icon={CheckCircle2} label="Done Today" value={stats?.completedToday ?? 0} color="bg-green-50 text-green-700" active={scope === 'completed'} onClick={() => setScope('completed')} />
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {SCOPES.map(s => (
            <button key={s.id} type="button" onClick={() => setScope(s.id)}
              className={`px-3 py-1.5 ${scope === s.id ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lead name, phone, code…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        {canViewAll && (
          <select value={assignee} onChange={e => setAssignee(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">All sales users</option>
            {users?.filter(u => u.isActive).map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : !data?.items.length ? (
          <div className="py-16 text-center text-gray-400">No follow-ups in this view</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.items.map(f => (
              <div key={f.id} className={`p-4 flex flex-wrap items-start gap-4 ${f.isOverdue ? 'bg-red-50/40' : ''}`}>
                <div className="flex-1 min-w-56">
                  <button type="button" onClick={() => setViewLeadId(f.leadId)}
                    className="text-left font-semibold text-gray-900 hover:text-amber-700">
                    {f.leadName || 'Lead'}
                  </button>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{f.leadCode}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge label={followUpTypeLabel[f.type as FollowUpType]} colorClass="bg-blue-100 text-blue-700" />
                    {f.leadStatus != null && <Badge label={leadStatusLabel[f.leadStatus]} colorClass={leadStatusColor[f.leadStatus]} />}
                    {f.isOverdue && <Badge label="Overdue" colorClass="bg-red-100 text-red-700" />}
                    {f.isDueToday && <Badge label="Today" colorClass="bg-amber-100 text-amber-700" />}
                  </div>
                </div>
                <div className="text-sm text-gray-600 min-w-40">
                  <p className="flex items-center gap-1"><CalendarClock size={13} />{fmtDateTime(f.scheduledAt)}</p>
                  {f.leadPhone && <p className="flex items-center gap-1 mt-1"><Phone size={13} />{f.leadPhone}</p>}
                  {f.assignedToUserName && <p className="text-xs text-gray-400 mt-1">Owner: {f.assignedToUserName}</p>}
                  {f.notes && <p className="text-xs text-gray-500 mt-1">{f.notes}</p>}
                  {f.outcome && <p className="text-xs text-green-700 mt-1">Outcome: {f.outcome}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewLeadId(f.leadId)}>Open Lead</Button>
                  {!f.isCompleted && completingId !== f.id && (
                    <Button size="sm" onClick={() => setCompletingId(f.id)}>Complete</Button>
                  )}
                </div>
                {completingId === f.id && (
                  <div className="w-full flex gap-2 items-center bg-white border border-gray-200 rounded-lg p-2">
                    <input value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="Outcome of this follow-up…"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm" autoFocus />
                    <Button size="sm" loading={completeMutation.isPending}
                      onClick={() => completeMutation.mutate({ id: f.id, outcome })}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setCompletingId(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!viewLeadId} onClose={() => setViewLeadId(null)} title="Lead Detail" size="lg">
        {viewLeadId && (
          <LeadDetail leadId={viewLeadId} onChanged={invalidate} onClose={() => setViewLeadId(null)} />
        )}
      </Modal>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, active, onClick }: {
  icon: typeof CalendarClock; label: string; value: number; color: string; active: boolean; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className={`card p-4 text-left transition-all ${active ? 'ring-2 ring-amber-500' : ''}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon size={16} /></div>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </button>
  )
}
