import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Phone, Mail, Trash2, CalendarClock } from 'lucide-react'
import { crmApi, usersApi } from '../../api'
import { fmtCurrency, fmtDate, leadStatusColor, leadStatusLabel, leadSourceLabel } from '../../utils/format'
import { LeadStatus } from '../../types'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import LeadForm from './components/LeadForm'
import LeadDetail from './components/LeadDetail'
import { useAuthStore } from '../../store/authStore'

const PIPELINE_STATUSES = [LeadStatus.New, LeadStatus.Contacted, LeadStatus.Interested, LeadStatus.Negotiating, LeadStatus.Won, LeadStatus.Lost]

export default function CrmPage() {
  const qc = useQueryClient()
  const canViewAll = useAuthStore(s => s.canViewAllLeads())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('')
  const [assignee, setAssignee] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [viewLeadId, setViewLeadId] = useState<string | null>(null)

  const { data: pipeline } = useQuery({ queryKey: ['crm-pipeline'], queryFn: crmApi.pipeline })
  const { data: stats } = useQuery({ queryKey: ['followup-stats'], queryFn: crmApi.followUpStats })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.list, enabled: canViewAll })
  const { data, isLoading } = useQuery({
    queryKey: ['leads', search, statusFilter, assignee],
    queryFn: () => crmApi.list({
      searchTerm: search || undefined,
      status: statusFilter || undefined,
      assignedToUserId: assignee || undefined,
      pageNumber: 1,
      pageSize: 100,
    }),
    placeholderData: p => p,
  })

  const deleteMutation = useMutation({
    mutationFn: crmApi.delete,
    onSuccess: () => {
      toast.success('Lead deleted')
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['crm-pipeline'] })
    },
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['leads'] })
    qc.invalidateQueries({ queryKey: ['crm-pipeline'] })
    qc.invalidateQueries({ queryKey: ['followup-stats'] })
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM — Leads</h1>
          <p className="text-sm text-gray-500">
            {data?.totalCount ?? 0} leads
            {!canViewAll && ' · showing your leads only'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/crm/follow-ups">
            <Button size="sm" variant="outline">
              <CalendarClock size={15} />
              Follow-ups
              {(stats?.dueToday || stats?.overdue) ? (
                <span className="ml-1 bg-amber-100 text-amber-800 text-xs px-1.5 rounded-full">
                  {(stats?.overdue ?? 0) + (stats?.dueToday ?? 0)}
                </span>
              ) : null}
            </Button>
          </Link>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={15} /> Add Lead</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {PIPELINE_STATUSES.map(status => {
          const summary = pipeline?.find(p => p.status === status)
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              className={`card p-4 text-left transition-all ${statusFilter === status ? 'ring-2 ring-amber-500' : ''}`}
            >
              <Badge label={leadStatusLabel[status]} colorClass={leadStatusColor[status]} />
              <p className="text-2xl font-bold text-gray-900 mt-2">{summary?.count ?? 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">{fmtCurrency(summary?.totalBudget ?? 0)} budget</p>
            </button>
          )
        })}
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email, code…"
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
        {(statusFilter !== '' || assignee) && (
          <button onClick={() => { setStatusFilter(''); setAssignee('') }}
            className="text-xs text-gray-500 hover:text-red-600 underline self-center">Clear filters</button>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : data?.items.length ? (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="table-th">Lead</th>
              <th className="table-th">Source</th>
              <th className="table-th">Status</th>
              <th className="table-th">Interested In</th>
              {canViewAll && <th className="table-th">Owner</th>}
              <th className="table-th text-right">Budget</th>
              <th className="table-th">Next Follow-up</th>
              <th className="table-th"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setViewLeadId(lead.id)}>
                  <td className="table-td">
                    <p className="font-medium text-gray-900">{lead.fullName}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-2">
                      <span className="font-mono">{lead.leadCode}</span>
                      {lead.phone && <span className="flex items-center gap-1"><Phone size={11} />{lead.phone}</span>}
                      {lead.email && <span className="flex items-center gap-1"><Mail size={11} />{lead.email}</span>}
                    </p>
                  </td>
                  <td className="table-td">{leadSourceLabel[lead.source]}</td>
                  <td className="table-td"><Badge label={leadStatusLabel[lead.status]} colorClass={leadStatusColor[lead.status]} /></td>
                  <td className="table-td">{lead.interestedIn ?? '—'}</td>
                  {canViewAll && <td className="table-td text-xs">{lead.assignedToUserName ?? '—'}</td>}
                  <td className="table-td text-right font-medium">{lead.budget ? fmtCurrency(lead.budget) : '—'}</td>
                  <td className="table-td">
                    {lead.nextFollowUpDate ? fmtDate(lead.nextFollowUpDate) : '—'}
                    {lead.openFollowUpCount > 0 && (
                      <span className="ml-1 text-xs text-amber-700">({lead.openFollowUpCount} open)</span>
                    )}
                  </td>
                  <td className="table-td" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { if (confirm('Delete this lead?')) deleteMutation.mutate(lead.id) }}
                      className="p-1 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center text-gray-400">No leads found</div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Lead" size="lg">
        <LeadForm onSuccess={() => { setShowCreate(false); invalidate(); toast.success('Lead created') }} />
      </Modal>

      <Modal open={!!viewLeadId} onClose={() => setViewLeadId(null)} title="Lead Details" size="xl">
        {viewLeadId && <LeadDetail leadId={viewLeadId} onChanged={invalidate} onClose={() => setViewLeadId(null)} />}
      </Modal>
    </div>
  )
}
