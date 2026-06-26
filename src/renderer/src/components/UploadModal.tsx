import React, { useState } from 'react'
import type { Video, QueueItemCreate } from '../../../shared/types'

const CATEGORIES = [
  { id: '1',  label: 'Film & Animation' },
  { id: '2',  label: 'Autos & Vehicles' },
  { id: '10', label: 'Music' },
  { id: '15', label: 'Pets & Animals' },
  { id: '17', label: 'Sports' },
  { id: '19', label: 'Travel & Events' },
  { id: '20', label: 'Gaming' },
  { id: '22', label: 'People & Blogs' },
  { id: '23', label: 'Comedy' },
  { id: '24', label: 'Entertainment' },
  { id: '25', label: 'News & Politics' },
  { id: '26', label: 'Howto & Style' },
  { id: '27', label: 'Education' },
  { id: '28', label: 'Science & Technology' },
  { id: '29', label: 'Nonprofits & Activism' }
]

interface Props {
  video: Video
  onQueued: (item: import('../../../shared/types').QueueItem) => void
  onCancel: () => void
}

export default function UploadModal({ video, onQueued, onCancel }: Props): React.ReactElement {
  const [filePath, setFilePath] = useState('')
  const [thumbPath, setThumbPath] = useState('')
  const [title, setTitle] = useState(video.title)
  const [description, setDescription] = useState(video.description)
  const [tags, setTags] = useState(video.tags)
  const [category, setCategory] = useState('22')
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public')
  const [scheduleAt, setScheduleAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pickFile = async (type: 'video' | 'thumb') => {
    const result = await window.api.dialog.openFile({
      title: type === 'video' ? 'Select Video File' : 'Select Thumbnail Image',
      filters: type === 'video'
        ? [{ name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'] }]
        : [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
      properties: ['openFile']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      if (type === 'video') setFilePath(result.filePaths[0])
      else setThumbPath(result.filePaths[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!filePath) { setError('Please select a video file.'); return }
    if (!title.trim()) { setError('Title is required.'); return }

    setError(null)
    setSubmitting(true)

    try {
      const data: QueueItemCreate = {
        video_id: video.id,
        local_file_path: filePath,
        thumbnail_path: thumbPath || null,
        yt_title: title.trim(),
        yt_description: description,
        yt_tags: tags,
        yt_category: category,
        yt_visibility: visibility,
        publish_at: scheduleAt ? new Date(scheduleAt).toISOString() : null
      }
      const item = await window.api.upload.addToQueue(data)
      onQueued(item)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add to queue')
    } finally {
      setSubmitting(false)
    }
  }

  const fileName = (p: string) => p ? p.split('/').pop() ?? p : ''

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* File pickers */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-yt-muted mb-1">Video File *</label>
          <button type="button" onClick={() => pickFile('video')}
            className="w-full bg-yt-elevated border border-yt-border hover:border-yt-red/50 rounded-lg px-3 py-2 text-left text-sm transition-colors">
            {filePath
              ? <span className="text-yt-text truncate block">{fileName(filePath)}</span>
              : <span className="text-yt-muted">Browse…</span>}
          </button>
        </div>
        <div>
          <label className="block text-xs text-yt-muted mb-1">Thumbnail <span className="text-yt-muted/50">(optional)</span></label>
          <button type="button" onClick={() => pickFile('thumb')}
            className="w-full bg-yt-elevated border border-yt-border hover:border-yt-red/50 rounded-lg px-3 py-2 text-left text-sm transition-colors">
            {thumbPath
              ? <span className="text-yt-text truncate block">{fileName(thumbPath)}</span>
              : <span className="text-yt-muted">Browse…</span>}
          </button>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs text-yt-muted mb-1">Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red" />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-yt-muted mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={5000}
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red resize-none" />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs text-yt-muted mb-1">Tags <span className="text-yt-muted/50">(comma-separated)</span></label>
        <input value={tags} onChange={e => setTags(e.target.value)}
          placeholder="react, webdev, tutorial"
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red" />
      </div>

      {/* Category + Visibility row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-yt-muted mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text focus:outline-none focus:border-yt-red">
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-yt-muted mb-1">Visibility</label>
          <select value={visibility} onChange={e => setVisibility(e.target.value as typeof visibility)}
            className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text focus:outline-none focus:border-yt-red">
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      {/* Scheduled publish */}
      <div>
        <label className="block text-xs text-yt-muted mb-1">
          Schedule publish time <span className="text-yt-muted/50">(leave empty to publish as soon as upload finishes)</span>
        </label>
        <input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)}
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text focus:outline-none focus:border-yt-red" />
      </div>

      {scheduleAt && (
        <p className="text-xs text-yt-muted bg-yt-elevated rounded-lg px-3 py-2">
          Video will be uploaded as <strong>Private</strong> and YouTube will make it public at the scheduled time.
        </p>
      )}

      {error && (
        <div className="px-3 py-2 bg-red-900/30 border border-red-700/40 rounded-lg text-xs text-red-300">{error}</div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-yt-muted hover:text-yt-text">Cancel</button>
        <button type="submit" disabled={submitting || !filePath}
          className="px-4 py-2 text-sm bg-yt-red hover:bg-red-600 disabled:opacity-40 text-white rounded-lg font-medium transition-colors">
          {submitting ? 'Adding…' : scheduleAt ? 'Schedule Upload' : 'Upload Now'}
        </button>
      </div>
    </form>
  )
}
