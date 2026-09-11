import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileUp, FileText, Trash2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { certificatesApi } from '../../../api'
import Spinner from '../../../components/ui/Spinner'
import type { ItemMedia } from '../../../types'

export const CERTIFICATE_KINDS = ['BIS', 'Hallmark', 'GIA', 'IGI', 'HRD', 'SGL', 'GII', 'Other'] as const
export type CertificateKind = (typeof CERTIFICATE_KINDS)[number]

export interface PendingCertificate {
  file: File
  kind: CertificateKind
}

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp'
const MAX_BYTES = 15 * 1024 * 1024

function isAllowed(file: File) {
  const name = file.name.toLowerCase()
  return file.type === 'application/pdf' || name.endsWith('.pdf')
    || file.type.startsWith('image/jpeg') || name.endsWith('.jpg') || name.endsWith('.jpeg')
    || file.type === 'image/png' || name.endsWith('.png')
    || file.type === 'image/webp' || name.endsWith('.webp')
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isPdf(fileName: string, contentType?: string) {
  return contentType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
}

interface Props {
  itemId?: string
  pending?: PendingCertificate[]
  onPendingChange?: (files: PendingCertificate[]) => void
  defaultKind?: string
}

export default function CertificateFilesManager({ itemId, pending = [], onPendingChange, defaultKind }: Props) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<CertificateKind>(
    CERTIFICATE_KINDS.includes((defaultKind ?? '') as CertificateKind) ? defaultKind as CertificateKind : 'BIS',
  )
  const [dragging, setDragging] = useState(false)
  const isEdit = !!itemId

  const { data: files, isLoading } = useQuery({
    queryKey: ['item-certificates', itemId],
    queryFn: () => certificatesApi.list(itemId!),
    enabled: isEdit,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['item-certificates', itemId] })
    qc.invalidateQueries({ queryKey: ['inventory'] })
  }

  const uploadMutation = useMutation({
    mutationFn: (picked: File[]) => certificatesApi.upload(itemId!, picked, kind),
    onSuccess: (added) => { toast.success(`${added.length} certificate file(s) uploaded`); invalidate() },
    onError: () => toast.error('Certificate upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => certificatesApi.delete(itemId!, mediaId),
    onSuccess: () => { toast.success('Certificate removed'); invalidate() },
    onError: () => toast.error('Failed to remove certificate'),
  })

  const addFiles = (list: FileList | File[]) => {
    const ok: File[] = []
    for (const f of [...list]) {
      if (!isAllowed(f)) { toast.error(`${f.name}: use PDF, JPG, PNG, or WebP`); continue }
      if (f.size > MAX_BYTES) { toast.error(`${f.name}: must be 15 MB or smaller`); continue }
      ok.push(f)
    }
    if (!ok.length) return
    if (isEdit) uploadMutation.mutate(ok)
    else onPendingChange?.([...pending, ...ok.map(file => ({ file, kind }))])
  }

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={16} className="text-sky-700" /> Certificate files
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Scan or PDF of the BIS hallmark card and GIA/IGI report.</p>
        </div>
        {(uploadMutation.isPending || isLoading) && <Spinner size="sm" />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-600">
          Type
          <select
            value={kind}
            onChange={e => setKind(e.target.value as CertificateKind)}
            className="ml-2 px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {CERTIFICATE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          dragging ? 'border-sky-500 bg-sky-50' : 'border-sky-200 hover:border-sky-400 bg-white'
        }`}
      >
        <input
          ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
          onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = '' }}
        />
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <FileUp size={16} className="text-sky-700" />
          Drop {kind} files here or click to browse
        </div>
        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, WebP · up to 15 MB each</p>
      </div>

      {isEdit && !!files?.length && (
        <ul className="space-y-2">
          {files.map(f => (
            <CertificateRow
              key={f.id}
              file={f}
              onDelete={() => { if (confirm('Remove this certificate file?')) deleteMutation.mutate(f.id) }}
            />
          ))}
        </ul>
      )}

      {!isEdit && pending.length > 0 && (
        <ul className="space-y-2">
          {pending.map((p, i) => (
            <li key={`${p.file.name}-${i}`} className="flex items-center gap-3 bg-white border border-sky-100 rounded-lg px-3 py-2">
              <FileText size={16} className="text-sky-700 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.file.name}</p>
                <p className="text-xs text-gray-500">{p.kind} · {formatSize(p.file.size)}</p>
              </div>
              <button type="button" onClick={() => onPendingChange?.(pending.filter((_, j) => j !== i))}
                className="p-1 text-red-500 hover:text-red-700">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CertificateRow({ file, onDelete }: { file: ItemMedia; onDelete: () => void }) {
  const pdf = isPdf(file.fileName, file.contentType)
  return (
    <li className="flex items-center gap-3 bg-white border border-sky-100 rounded-lg px-3 py-2">
      {pdf ? (
        <FileText size={16} className="text-sky-700 shrink-0" />
      ) : (
        <img src={file.url} alt="" className="w-10 h-10 rounded object-cover border shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{file.fileName}</p>
        <p className="text-xs text-gray-500">{file.certificateKind || 'Certificate'} · {formatSize(file.fileSizeBytes)}</p>
      </div>
      <a href={file.url} target="_blank" rel="noreferrer" className="p-1 text-sky-700 hover:text-sky-900" title="Open">
        <ExternalLink size={14} />
      </a>
      <button type="button" onClick={onDelete} className="p-1 text-red-500 hover:text-red-700" title="Remove">
        <Trash2 size={14} />
      </button>
    </li>
  )
}
