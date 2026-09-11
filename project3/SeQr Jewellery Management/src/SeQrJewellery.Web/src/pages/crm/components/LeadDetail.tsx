import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Phone, Mail, Calendar, CheckCircle2, UserCheck, Plus, StickyNote, Activity, Pin, Trash2, User } from 'lucide-react'
import { crmApi, usersApi } from '../../../api'
import { fmtCurrency, fmtDateTime, leadStatusColor, leadStatusLabel, leadSourceLabel, followUpTypeLabel, leadActivityLabel } from '../../../utils/format'
import { LeadStatus, FollowUpType } from '../../../types'
import type { CreateLeadFollowUpRequest } from '../../../types'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import { Select, TextArea } from '../../../components/ui/Input'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../store/authStore'

interface Props { leadId: string; onChanged: () => void; onClose: () => void }

type Tab = 'followups' | 'notes' | 'activity'

export default function LeadDetail({ leadId, onChanged, onClose }: Props) {
  const qc = useQueryClient()
  const canViewAll = useAuthStore(s => s.canViewAllLeads())
  const [tab, setTab] = useState<Tab>('followups')
  const [showAddFollowUp, setShowAddFollowUp] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [followUpType, setFollowUpType] = useState<FollowUpType>(FollowUpType.Call)
  const [scheduledAt, setScheduledAt] = useState(new Date().toISOString().slice(0, 16))
  const [followUpNotes, setFollowUpNotes] = useState('')
  const [noteText, setNoteText] = useState('')
  const [pinNote, setPinNote] = useState(false)
  const [convertEmail, setConvertEmail] = useState('')
  const [convertAddress, setConvertAddress] = useState('')
  const [outcomeText, setOutcomeText] = useState('')
  const [completingId, setCompletingId] = useState<string | null>(null)

  const { data: lead, isLoading } = useQuery({ queryKey: ['lead', leadId], queryFn: () => crmApi.getById(leadId) })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.list, enabled: canViewAll })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['lead', leadId] })
    qc.invalidateQueries({ queryKey: ['followups'] })
    qc.invalidateQueries({ queryKey: ['followup-stats'] })
    onChanged()
  }

  const statusMutation = useMutation({
    mutationFn: (status: LeadStatus) => crmApi.update(leadId, { status }),
    onSuccess: () => { refresh(); toast.success('Status updated') },
  })

  const assignMutation = useMutation({
    mutationFn: (assignedToUserId: string) =>
      assignedToUserId
        ? crmApi.update(leadId, { assignedToUserId })
        : crmApi.update(leadId, { clearAssignee: true }),
    onSuccess: () => { refresh(); toast.success('Assignee updated') },
  })

  const addFollowUpMutation = useMutation({
    mutationFn: (req: CreateLeadFollowUpRequest) => crmApi.addFollowUp(leadId, req),
    onSuccess: () => { refresh(); setShowAddFollowUp(false); setFollowUpNotes(''); toast.success('Follow-up scheduled') },
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: string }) => crmApi.completeFollowUp(id, { outcome }),
    onSuccess: () => { refresh(); setCompletingId(null); setOutcomeText(''); toast.success('Follow-up marked complete') },
  })

  const addNoteMutation = useMutation({
    mutationFn: () => crmApi.addNote(leadId, { content: noteText, isPinned: pinNote }),
    onSuccess: () => { refresh(); setNoteText(''); setPinNote(false); toast.success('Note added'); setTab('notes') },
  })

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => crmApi.deleteNote(leadId, noteId),
    onSuccess: () => { refresh(); toast.success('Note deleted') },
  })

  const convertMutation = useMutation({
    mutationFn: () => crmApi.convert(leadId, { email: convertEmail || undefined, address: convertAddress || undefined }),
    onSuccess: (res) => { refresh(); setShowConvert(false); toast.success(`Converted to customer ${res.customerCode}`) },
  })

  if (isLoading || !lead) return <div className="py-16 text-center text-gray-400">Loading…</div>

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'followups', label: 'Follow-ups', count: lead.followUps?.length },
    { id: 'notes', label: 'Notes', count: lead.leadNotes?.length ?? lead.noteCount },
    { id: 'activity', label: 'Activity', count: lead.activities?.length },
  ]

  const userOptions = [
    { value: '', label: 'Unassigned' },
    ...(users?.filter(u => u.isActive).map(u => ({
      value: u.id, label: `${u.firstName} ${u.lastName}`,
    })) ?? []),
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 font-mono">{lead.leadCode}</p>
          <h3 className="text-xl font-bold text-gray-900">{lead.fullName}</h3>
          <p className="text-sm text-gray-500 flex flex-wrap items-center gap-3 mt-1">
            {lead.phone && <span className="flex items-center gap-1"><Phone size={13} />{lead.phone}</span>}
            {lead.email && <span className="flex items-center gap-1"><Mail size={13} />{lead.email}</span>}
            {lead.assignedToUserName && (
              <span className="flex items-center gap-1"><User size={13} />{lead.assignedToUserName}</span>
            )}
          </p>
        </div>
        <div className="text-right space-y-2 shrink-0">
          <Badge label={leadStatusLabel[lead.status]} colorClass={leadStatusColor[lead.status]} />
          {!lead.convertedCustomerId ? (
            <Select
              options={Object.entries(leadStatusLabel).map(([v, l]) => ({ value: Number(v), label: l }))}
              value={lead.status}
              onChange={e => statusMutation.mutate(Number(e.target.value) as LeadStatus)}
              className="text-xs"
            />
          ) : (
            <p className="text-xs text-green-600 font-medium flex items-center gap-1 justify-end">
              <UserCheck size={13} /> Converted
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 rounded-lg p-3 text-sm">
        <div><p className="text-xs text-gray-500">Source</p><p className="font-medium">{leadSourceLabel[lead.source]}</p></div>
        <div><p className="text-xs text-gray-500">Budget</p><p className="font-medium">{lead.budget ? fmtCurrency(lead.budget) : '—'}</p></div>
        <div><p className="text-xs text-gray-500">Interested In</p><p className="font-medium">{lead.interestedIn ?? '—'}</p></div>
        <div><p className="text-xs text-gray-500">Occasion</p><p className="font-medium">{lead.occasion ?? '—'}</p></div>
      </div>

      {canViewAll && !lead.convertedCustomerId && (
        <Select
          label="Assigned To"
          options={userOptions}
          value={lead.assignedToUserId ?? ''}
          onChange={e => assignMutation.mutate(e.target.value)}
        />
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}{t.count != null ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {tab === 'followups' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-gray-700 text-sm">Follow-ups</p>
            <Button size="sm" variant="outline" onClick={() => setShowAddFollowUp(v => !v)}><Plus size={13} /> Schedule</Button>
          </div>

          {showAddFollowUp && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Select label="Type" value={followUpType} onChange={e => setFollowUpType(Number(e.target.value) as FollowUpType)}
                  options={Object.entries(followUpTypeLabel).map(([v, l]) => ({ value: Number(v), label: l }))} />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Scheduled At</label>
                  <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              <input value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)} placeholder="Notes (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowAddFollowUp(false)}>Cancel</Button>
                <Button size="sm" loading={addFollowUpMutation.isPending}
                  onClick={() => addFollowUpMutation.mutate({ type: followUpType, scheduledAt: new Date(scheduledAt).toISOString(), notes: followUpNotes || undefined })}>
                  Save
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lead.followUps?.length ? lead.followUps.map(f => (
              <div key={f.id} className={`p-3 rounded-lg text-sm ${f.isCompleted ? 'bg-green-50' : f.isOverdue ? 'bg-red-50' : 'bg-blue-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-800 flex items-center gap-2">
                      {followUpTypeLabel[f.type]}
                      {f.isCompleted && <CheckCircle2 size={13} className="text-green-600" />}
                      {f.isOverdue && !f.isCompleted && <Badge label="Overdue" colorClass="bg-red-100 text-red-700" />}
                      {f.isDueToday && !f.isCompleted && <Badge label="Today" colorClass="bg-amber-100 text-amber-700" />}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={11} />{fmtDateTime(f.scheduledAt)}</p>
                    {f.notes && <p className="text-xs text-gray-500 mt-0.5">{f.notes}</p>}
                    {f.outcome && <p className="text-xs text-green-700 mt-0.5">Outcome: {f.outcome}</p>}
                  </div>
                  {!f.isCompleted && completingId !== f.id && (
                    <Button size="sm" variant="ghost" onClick={() => setCompletingId(f.id)}>Mark Done</Button>
                  )}
                </div>
                {completingId === f.id && (
                  <div className="mt-2 flex gap-2">
                    <input value={outcomeText} onChange={e => setOutcomeText(e.target.value)} placeholder="Outcome…"
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    <Button size="sm" loading={completeMutation.isPending}
                      onClick={() => completeMutation.mutate({ id: f.id, outcome: outcomeText })}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setCompletingId(null)}>Cancel</Button>
                  </div>
                )}
              </div>
            )) : <p className="text-sm text-gray-400 text-center py-4">No follow-ups scheduled</p>}
          </div>
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <TextArea label="Add a note" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Log a conversation, preference, or reminder…" />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={pinNote} onChange={e => setPinNote(e.target.checked)} className="rounded text-amber-600" />
                Pin note
              </label>
              <Button size="sm" disabled={!noteText.trim()} loading={addNoteMutation.isPending} onClick={() => addNoteMutation.mutate()}>
                <StickyNote size={13} /> Add Note
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lead.leadNotes?.length ? lead.leadNotes.map(n => (
              <div key={n.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-gray-800 whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {n.createdByUserName} · {fmtDateTime(n.createdAt)}
                      {n.isPinned && <span className="inline-flex items-center gap-0.5 ml-2 text-amber-600"><Pin size={10} /> Pinned</span>}
                    </p>
                  </div>
                  <button type="button" onClick={() => deleteNoteMutation.mutate(n.id)} className="text-gray-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )) : <p className="text-sm text-gray-400 text-center py-4">No notes yet</p>}
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {lead.activities?.length ? lead.activities.map(a => (
            <div key={a.id} className="flex gap-3 text-sm border-l-2 border-amber-300 pl-3 py-1">
              <div className="flex-1">
                <p className="font-medium text-gray-800 flex items-center gap-2">
                  <Activity size={12} className="text-amber-600" />
                  {a.summary}
                </p>
                {a.details && <p className="text-xs text-gray-500 mt-0.5">{a.details}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  {leadActivityLabel[a.activityType] ?? 'Activity'} · {a.performedByUserName} · {fmtDateTime(a.occurredAt)}
                </p>
              </div>
            </div>
          )) : <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>}
        </div>
      )}

      {!lead.convertedCustomerId && (
        <div className="border-t pt-4">
          {!showConvert ? (
            <Button variant="outline" size="sm" onClick={() => setShowConvert(true)}><UserCheck size={14} /> Convert to Customer</Button>
          ) : (
            <div className="bg-green-50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-green-800">Convert this lead into a customer record</p>
              <input value={convertEmail} onChange={e => setConvertEmail(e.target.value)} placeholder={`Email (${lead.email ?? 'optional'})`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <input value={convertAddress} onChange={e => setConvertAddress(e.target.value)} placeholder="Address (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowConvert(false)}>Cancel</Button>
                <Button size="sm" loading={convertMutation.isPending} onClick={() => convertMutation.mutate()}>Confirm Conversion</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}
