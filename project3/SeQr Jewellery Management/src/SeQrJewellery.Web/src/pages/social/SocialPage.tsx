import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Send, Camera as InstagramIcon, MessageCircle, Image as ImageIcon } from 'lucide-react'
import { socialApi, settingsApi } from '../../api'
import { fmtDateTime, socialPostStatusColor, socialPostStatusLabel } from '../../utils/format'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'

type Tab = 'reviews' | 'instagram'

export default function SocialPage() {
  const [tab, setTab] = useState<Tab>('reviews')
  const { data: settings } = useQuery({ queryKey: ['social-settings'], queryFn: settingsApi.getSocialSettings })

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Social Media</h1>
          <p className="text-sm text-gray-500">
            Google: {settings?.googleConnected ? <span className="text-green-600 font-medium">Connected</span> : <span className="text-red-500">Not connected</span>}
            {' · '}
            Instagram: {settings?.instagramConnected ? <span className="text-green-600 font-medium">Connected</span> : <span className="text-red-500">Not connected</span>}
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['reviews', 'instagram'] as Tab[]).map(key => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >{key === 'reviews' ? 'Google Reviews' : 'Instagram'}</button>
        ))}
      </div>

      {tab === 'reviews' ? <ReviewsTab connected={!!settings?.googleConnected} /> : <InstagramTab connected={!!settings?.instagramConnected} />}
    </div>
  )
}

function ReviewsTab({ connected }: { connected: boolean }) {
  const qc = useQueryClient()
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const { data: reviews, isLoading, isError } = useQuery({ queryKey: ['google-reviews'], queryFn: socialApi.googleReviews, enabled: connected, retry: false })

  const replyMutation = useMutation({
    mutationFn: () => socialApi.replyToReview(replyingTo!, replyText),
    onSuccess: () => { toast.success('Reply posted'); setReplyingTo(null); setReplyText(''); qc.invalidateQueries({ queryKey: ['google-reviews'] }) },
    onError: () => toast.error('Failed to post reply'),
  })

  if (!connected) return <NotConnectedCard platform="Google Business Profile" settingsHint="Settings → Invoice tab has no Google config yet — add your Google Business Profile credentials via Settings API." />

  if (isLoading) return <div className="py-16 text-center text-gray-400">Loading reviews…</div>
  if (isError) return <div className="py-16 text-center text-red-500">Failed to load reviews. Check your Google credentials.</div>

  return (
    <div className="space-y-3">
      {reviews?.length ? reviews.map(r => (
        <div key={r.reviewId} className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-900">{r.reviewerName}</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={13} className={i < (r.starRating ?? 0) ? 'text-amber-500 fill-amber-500' : 'text-gray-200'} />
                ))}
              </div>
            </div>
            <span className="text-xs text-gray-400">{fmtDateTime(r.createTime)}</span>
          </div>
          <p className="text-sm text-gray-700 mt-2">{r.comment}</p>
          {r.replyComment ? (
            <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-xs font-medium text-gray-500 mb-1">Your reply</p>
              <p className="text-gray-700">{r.replyComment}</p>
            </div>
          ) : replyingTo === r.reviewId ? (
            <div className="mt-3 space-y-2">
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} placeholder="Write a reply…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setReplyingTo(null)}>Cancel</Button>
                <Button size="sm" loading={replyMutation.isPending} onClick={() => replyMutation.mutate()}><Send size={13} /> Post Reply</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setReplyingTo(r.reviewId)} className="mt-2 text-xs text-amber-600 hover:underline flex items-center gap-1">
              <MessageCircle size={12} /> Reply
            </button>
          )}
        </div>
      )) : <div className="py-16 text-center text-gray-400">No reviews yet</div>}
    </div>
  )
}

function InstagramTab({ connected }: { connected: boolean }) {
  const qc = useQueryClient()
  const [imageUrl, setImageUrl] = useState('')
  const [caption, setCaption] = useState('')

  const { data: posts, isLoading } = useQuery({ queryKey: ['instagram-posts'], queryFn: socialApi.instagramPosts })

  const createMutation = useMutation({
    mutationFn: () => socialApi.createInstagramPost({ imageUrl, caption }),
    onSuccess: () => { toast.success('Published to Instagram'); setImageUrl(''); setCaption(''); qc.invalidateQueries({ queryKey: ['instagram-posts'] }) },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Failed to publish'),
  })

  return (
    <div className="space-y-5">
      {!connected && <NotConnectedCard platform="Instagram" settingsHint="Add your Meta access token and Instagram Business Account ID via Settings → Social API to enable publishing." />}

      <div className="card p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><InstagramIcon size={16} /> Create New Post</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL (publicly accessible)"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div className="flex justify-end mt-3">
          <Button size="sm" disabled={!connected || !imageUrl || !caption} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
            <Send size={13} /> Publish
          </Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b"><h3 className="font-semibold text-gray-800">Post History</h3></div>
        {isLoading ? (
          <div className="py-10 text-center text-gray-400">Loading…</div>
        ) : posts?.length ? (
          <div className="divide-y">
            {posts.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                {p.imageUrl ? (
                  <img src={p.imageUrl} className="w-12 h-12 rounded-lg object-cover border" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300"><ImageIcon size={18} /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{p.caption}</p>
                  <p className="text-xs text-gray-400">{fmtDateTime(p.publishedAt ?? p.createdAt)}</p>
                  {p.errorMessage && <p className="text-xs text-red-500 mt-0.5">{p.errorMessage}</p>}
                </div>
                <Badge label={socialPostStatusLabel[p.status]} colorClass={socialPostStatusColor[p.status]} />
              </div>
            ))}
          </div>
        ) : <div className="py-10 text-center text-gray-400">No posts yet</div>}
      </div>
    </div>
  )
}

function NotConnectedCard({ platform, settingsHint }: { platform: string; settingsHint: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <InstagramIcon size={26} className="text-amber-600" />
      </div>
      <h3 className="font-semibold text-gray-800 mb-1">{platform} not connected</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">{settingsHint}</p>
    </div>
  )
}
