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

const basename = (p: string) => p.split('/').pop() ?? p

const inputCls = "w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red"
const miniInputCls = "bg-yt-elevated border border-yt-border rounded-lg px-2 py-1 text-xs text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red"

export default function VideoForm({ initial, onSubmit, onCancel }: VideoFormProps): React.ReactElement {
  const [form, setForm] = useState<VideoCreate>({
    title:               initial?.title               ?? '',
    description:         initial?.description         ?? '',
    tags:                initial?.tags                ?? '',
    thumbnail_concept:   initial?.thumbnail_concept   ?? '',
    priority:            initial?.priority            ?? 'medium',
    stage:               initial?.stage               ?? 'idea',
    series_id:           initial?.series_id           ?? null,
    episode_order:       initial?.episode_order       ?? 0,
    scheduled_date:      initial?.scheduled_date      ?? null,
    notes:               initial?.notes               ?? '',
    youtube_video_id:    initial?.youtube_video_id    ?? null,
    thumbnail_path:      initial?.thumbnail_path      ?? null,
    archived:            initial?.archived            ?? 0,
    script_path:         initial?.script_path         ?? null,
    script_word_count:   initial?.script_word_count   ?? null,
    script_draft_quality: initial?.script_draft_quality ?? null,
    assets_folder_path:  initial?.assets_folder_path  ?? null,
  })

  const set = (key: keyof VideoCreate) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const setField = <K extends keyof VideoCreate>(key: K, value: VideoCreate[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit(form)
  }

  const pickScript = async () => {
    const result = await window.api.dialog.openFile({
      title: 'Select Script',
      filters: [{ name: 'Documents', extensions: ['pdf', 'docx', 'pages'] }]
    })
    if (!result.canceled && result.filePaths[0]) {
      setField('script_path', result.filePaths[0])
    }
  }

  const pickFolder = async () => {
    const result = await window.api.dialog.openFolder()
    if (!result.canceled && result.filePaths[0]) {
      setField('assets_folder_path', result.filePaths[0])
    }
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
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-yt-muted mb-1">Priority</label>
          <select value={form.priority} onChange={set('priority')} className={inputCls}>
            {PRIORITIES.map(p => (
              <option key={p} value={p} className={priorityColor[p]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-yt-muted mb-1">Stage</label>
          <select value={form.stage} onChange={set('stage')} className={inputCls}>
            {STAGES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
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
          className={`${inputCls} resize-none`}
        />
      </div>

      <div>
        <label className="block text-xs text-yt-muted mb-1">
          Tags <span className="text-yt-muted/60">(comma-separated)</span>
        </label>
        <input value={form.tags} onChange={set('tags')} placeholder="react, tutorial, beginners" className={inputCls} />
      </div>

      <div>
        <label className="block text-xs text-yt-muted mb-1">Thumbnail Concept</label>
        <input
          value={form.thumbnail_concept}
          onChange={set('thumbnail_concept')}
          placeholder="Shocked face + code on screen, red text overlay"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs text-yt-muted mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          placeholder="Research links, references, ideas..."
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Attachments */}
      <div className="border-t border-yt-border pt-4 space-y-3">
        <p className="text-xs font-semibold text-yt-muted uppercase tracking-wider">Attachments</p>

        {/* Script */}
        <div className="bg-yt-elevated border border-yt-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-yt-text flex items-center gap-1.5">
              📄 Script
            </span>
            {form.script_path ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-yt-muted truncate max-w-[160px]" title={form.script_path}>
                  {basename(form.script_path)}
                </span>
                <button
                  type="button"
                  onClick={() => window.api.shell.openPath(form.script_path!)}
                  className="text-xs text-yt-muted hover:text-yt-text transition-colors"
                  title="Open file"
                >
                  ↗
                </button>
                <button
                  type="button"
                  onClick={() => { setField('script_path', null); setField('script_word_count', null); setField('script_draft_quality', null) }}
                  className="text-xs text-yt-muted hover:text-yt-red transition-colors"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={pickScript}
                className="text-xs text-yt-muted hover:text-yt-text border border-yt-border hover:border-yt-red/40 rounded px-2 py-1 transition-colors"
              >
                Attach script
              </button>
            )}
          </div>

          {form.script_path && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min={0}
                value={form.script_word_count ?? ''}
                onChange={e => setField('script_word_count', e.target.value ? Number(e.target.value) : null)}
                placeholder="Word count"
                className={`${miniInputCls} w-28`}
              />
              <select
                value={form.script_draft_quality ?? ''}
                onChange={e => setField('script_draft_quality', (e.target.value as 'rough' | 'final') || null)}
                className={miniInputCls}
              >
                <option value="">Draft quality</option>
                <option value="rough">Rough Draft</option>
                <option value="final">Final Draft</option>
              </select>
            </div>
          )}
        </div>

        {/* Assets folder */}
        <div className="bg-yt-elevated border border-yt-border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-yt-text flex items-center gap-1.5">
              📁 Assets Folder
            </span>
            {form.assets_folder_path ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-yt-muted truncate max-w-[160px]" title={form.assets_folder_path}>
                  {basename(form.assets_folder_path)}
                </span>
                <button
                  type="button"
                  onClick={() => window.api.shell.openPath(form.assets_folder_path!)}
                  className="text-xs text-yt-muted hover:text-yt-text transition-colors"
                  title="Open in Finder"
                >
                  ↗
                </button>
                <button
                  type="button"
                  onClick={() => setField('assets_folder_path', null)}
                  className="text-xs text-yt-muted hover:text-yt-red transition-colors"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={pickFolder}
                className="text-xs text-yt-muted hover:text-yt-text border border-yt-border hover:border-yt-red/40 rounded px-2 py-1 transition-colors"
              >
                Link folder
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-yt-muted hover:text-yt-text transition-colors">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 text-sm bg-yt-red hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
          {initial?.id ? 'Save Changes' : 'Add Idea'}
        </button>
      </div>
    </form>
  )
}
