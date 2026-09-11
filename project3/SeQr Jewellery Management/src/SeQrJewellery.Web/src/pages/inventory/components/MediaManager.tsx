import { useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Star, Trash2, Film } from 'lucide-react'
import toast from 'react-hot-toast'
import { mediaApi } from '../../../api'
import Spinner from '../../../components/ui/Spinner'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime'
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

function validateFiles(files: File[]): { ok: File[]; errors: string[] } {
  const ok: File[] = []
  const errors: string[] = []
  for (const f of files) {
    const isImage = f.type.startsWith('image/')
    const isVideo = f.type.startsWith('video/')
    if (!isImage && !isVideo) { errors.push(`${f.name}: unsupported type`); continue }
    if (isImage && f.size > MAX_IMAGE_BYTES) { errors.push(`${f.name}: images must be ≤ 10 MB`); continue }
    if (isVideo && f.size > MAX_VIDEO_BYTES) { errors.push(`${f.name}: videos must be ≤ 100 MB`); continue }
    ok.push(f)
  }
  return { ok, errors }
}

interface Props {
  /** Edit mode: media is uploaded/managed against this item immediately */
  itemId?: string
  /** Create mode: files are held locally and uploaded after the item is created */
  pendingFiles?: File[]
  onPendingChange?: (files: File[]) => void
}

export default function MediaManager({ itemId, pendingFiles = [], onPendingChange }: Props) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const isEdit = !!itemId

  const { data: media, isLoading } = useQuery({
    queryKey: ['item-media', itemId],
    queryFn: () => mediaApi.listForItem(itemId!),
    enabled: isEdit,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['item-media', itemId] })
    qc.invalidateQueries({ queryKey: ['inventory'] })
  }

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => mediaApi.upload(itemId!, files),
    onSuccess: (added) => { toast.success(`${added.length} file(s) uploaded`); invalidate() },
    onError: () => toast.error('Upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) => mediaApi.delete(itemId!, mediaId),
    onSuccess: () => { toast.success('Media removed'); invalidate() },
    onError: () => toast.error('Failed to remove media'),
  })

  const primaryMutation = useMutation({
    mutationFn: (mediaId: string) => mediaApi.setPrimary(itemId!, mediaId),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Failed to set primary image'),
  })

  const pendingPreviews = useMemo(
    () => pendingFiles.map(f => ({ file: f, url: URL.createObjectURL(f) })),
    [pendingFiles]
  )

  const addFiles = (list: FileList | File[]) => {
    const { ok, errors } = validateFiles([...list])
    errors.forEach(e => toast.error(e))
    if (!ok.length) return
    if (isEdit) uploadMutation.mutate(ok)
    else onPendingChange?.([...pendingFiles, ...ok])
  }

  const removePending = (idx: number) => onPendingChange?.(pendingFiles.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Photos &amp; Videos</p>
        {(uploadMutation.isPending || isLoading) && <Spinner size="sm" />}
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          dragging ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-400'
        }`}
      >
        <input
          ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
          onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = '' }}
        />
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <ImagePlus size={16} className="text-amber-600" />
          Drop images/videos here or click to browse
        </div>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF up to 10 MB · MP4, WebM, MOV up to 100 MB</p>
      </div>

      {/* Server media (edit mode) */}
      {isEdit && !!media?.length && (
        <div className="grid grid-cols-4 gap-3">
          {media.filter(m => m.mediaType !== 'Document').map(m => (
            <div key={m.id} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-50">
              {m.mediaType === 'Image' ? (
                <img src={m.url} alt={m.fileName} className="w-full h-full object-cover" />
              ) : (
                <video src={m.url} className="w-full h-full object-cover" muted />
              )}
              {m.mediaType === 'Video' && (
                <span className="absolute bottom-1 left-1 bg-black/60 text-white rounded p-0.5"><Film size={12} /></span>
              )}
              {m.isPrimary && (
                <span className="absolute top-1 left-1 bg-amber-500 text-white rounded-full p-1"><Star size={11} fill="currentColor" /></span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {m.mediaType === 'Image' && !m.isPrimary && (
                  <button type="button" title="Set as primary" onClick={() => primaryMutation.mutate(m.id)}
                    className="p-1.5 bg-white/90 rounded-full text-amber-600 hover:bg-white">
                    <Star size={14} />
                  </button>
                )}
                <button type="button" title="Delete" onClick={() => { if (confirm('Remove this file?')) deleteMutation.mutate(m.id) }}
                  className="p-1.5 bg-white/90 rounded-full text-red-500 hover:bg-white">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending files (create mode) */}
      {!isEdit && !!pendingPreviews.length && (
        <div className="grid grid-cols-4 gap-3">
          {pendingPreviews.map((p, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-50">
              {p.file.type.startsWith('image/') ? (
                <img src={p.url} alt={p.file.name} className="w-full h-full object-cover" />
              ) : (
                <video src={p.url} className="w-full h-full object-cover" muted />
              )}
              {p.file.type.startsWith('video/') && (
                <span className="absolute bottom-1 left-1 bg-black/60 text-white rounded p-0.5"><Film size={12} /></span>
              )}
              <button type="button" onClick={() => removePending(i)}
                className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
