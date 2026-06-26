import React, { useState } from 'react'
import type { Video, VideoCreate, Priority, Stage } from '../../../shared/types'

interface VideoFormProps {
  initial?: Partial<Video>
  onSubmit: (data: VideoCreate) => void
  onCancel: () => void
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high']
const STAGES: Stage[] = ['idea', 'script', 'filming', 'editing', 'scheduled', 'published']

const priorityColor: Record<Priority, string> = {
  low: 'text-yt-muted',
  medium: 'text-yellow-400',
  high: 'text-yt-red'
}

export default function VideoForm({ initial, onSubmit, onCancel }: VideoFormProps): React.ReactElement {
  const [form, setForm] = useState<VideoCreate>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    tags: initial?.tags ?? '',
    thumbnail_concept: initial?.thumbnail_concept ?? '',
    priority: initial?.priority ?? 'medium',
    stage: initial?.stage ?? 'idea',
    series_id: initial?.series_id ?? null,
    episode_order: initial?.episode_order ?? 0,
    scheduled_date: initial?.scheduled_date ?? null,
    notes: initial?.notes ?? ''
  })

  const set = (key: keyof VideoCreate) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-yt-muted mb-1">Title *</label>
        <input
          autoFocus
          value={form.title}
          onChange={set('title')}
          placeholder="Video title"
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-yt-muted mb-1">Priority</label>
          <select
            value={form.priority}
            onChange={set('priority')}
            className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text focus:outline-none focus:border-yt-red"
          >
            {PRIORITIES.map(p => (
              <option key={p} value={p} className={priorityColor[p]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-yt-muted mb-1">Stage</label>
          <select
            value={form.stage}
            onChange={set('stage')}
            className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text focus:outline-none focus:border-yt-red"
          >
            {STAGES.map(s => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-yt-muted mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={set('description')}
          placeholder="What's this video about?"
          rows={2}
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red resize-none"
        />
      </div>

      <div>
        <label className="block text-xs text-yt-muted mb-1">Tags <span className="text-yt-muted/60">(comma-separated)</span></label>
        <input
          value={form.tags}
          onChange={set('tags')}
          placeholder="react, tutorial, beginners"
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red"
        />
      </div>

      <div>
        <label className="block text-xs text-yt-muted mb-1">Thumbnail Concept</label>
        <input
          value={form.thumbnail_concept}
          onChange={set('thumbnail_concept')}
          placeholder="Shocked face + code on screen, red text overlay"
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red"
        />
      </div>

      <div>
        <label className="block text-xs text-yt-muted mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          placeholder="Research links, references, ideas..."
          rows={3}
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-yt-muted hover:text-yt-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-yt-red hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
        >
          {initial?.id ? 'Save Changes' : 'Add Idea'}
        </button>
      </div>
    </form>
  )
}
