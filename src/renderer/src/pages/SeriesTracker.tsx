import React, { useState, useEffect, useCallback } from 'react'
import { useSeries } from '../hooks/useSeries'
import { useVideos } from '../hooks/useVideos'
import Modal from '../components/Modal'
import type { Series, SeriesCreate, SeriesUpdate, Video } from '../../../shared/types'

interface SeriesFormProps {
  initial?: Partial<Series>
  onSubmit: (data: SeriesCreate) => void
  onCancel: () => void
}

function SeriesForm({ initial, onSubmit, onCancel }: SeriesFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit({ name, description }) }} className="space-y-4">
      <div>
        <label className="block text-xs text-yt-muted mb-1">Series Name *</label>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. React Deep Dives"
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red" />
      </div>
      <div>
        <label className="block text-xs text-yt-muted mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          rows={2} placeholder="What's this series about?"
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red resize-none" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-yt-muted hover:text-yt-text">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm bg-yt-red hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
          {initial?.id ? 'Save' : 'Create Series'}
        </button>
      </div>
    </form>
  )
}

interface SeriesDetailProps {
  series: Series
  allVideos: Video[]
  onClose: () => void
  onAssign: (videoId: number, seriesId: number, order: number) => Promise<void>
  onUnassign: (videoId: number) => Promise<void>
  onReorder: (videoId: number, order: number) => Promise<void>
}

function SeriesDetail({ series, allVideos, onClose, onAssign, onUnassign, onReorder }: SeriesDetailProps) {
  const [episodes, setEpisodes] = useState<Video[]>([])
  const [showAssign, setShowAssign] = useState(false)

  useEffect(() => {
    const eps = allVideos
      .filter(v => v.series_id === series.id)
      .sort((a, b) => a.episode_order - b.episode_order || a.created_at.localeCompare(b.created_at))
    setEpisodes(eps)
  }, [allVideos, series.id])

  const unassigned = allVideos.filter(v => v.series_id === null || v.series_id !== series.id)
  const published = episodes.filter(v => v.stage === 'published').length
  const pct = episodes.length ? Math.round((published / episodes.length) * 100) : 0

  const move = async (idx: number, dir: -1 | 1) => {
    const next = idx + dir
    if (next < 0 || next >= episodes.length) return
    await onReorder(episodes[idx].id, next)
    await onReorder(episodes[next].id, idx)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-yt-border flex-shrink-0">
        <button onClick={onClose} className="text-yt-muted hover:text-yt-text text-sm">← Back</button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-yt-text truncate">{series.name}</h2>
          {series.description && <p className="text-xs text-yt-muted mt-0.5">{series.description}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-semibold text-yt-text">{pct}% complete</div>
          <div className="text-xs text-yt-muted">{published}/{episodes.length} published</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 py-3 flex-shrink-0">
        <div className="h-1.5 bg-yt-elevated rounded-full overflow-hidden">
          <div className="h-full bg-yt-red rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Episode list */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2">
        {episodes.length === 0 ? (
          <div className="text-center text-yt-muted py-10 text-sm">No episodes yet — assign videos below.</div>
        ) : (
          episodes.map((ep, idx) => (
            <div key={ep.id} className="flex items-center gap-3 bg-yt-elevated border border-yt-border rounded-lg px-3 py-2.5">
              <span className="text-xs text-yt-muted w-5 text-center flex-shrink-0">#{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-yt-text truncate">{ep.title}</div>
                <div className="text-xs text-yt-muted capitalize">{ep.stage}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => move(idx, -1)} disabled={idx === 0}
                  className="text-yt-muted hover:text-yt-text disabled:opacity-20 text-xs px-1">▲</button>
                <button onClick={() => move(idx, 1)} disabled={idx === episodes.length - 1}
                  className="text-yt-muted hover:text-yt-text disabled:opacity-20 text-xs px-1">▼</button>
                <button onClick={() => onUnassign(ep.id)}
                  className="text-yt-muted hover:text-yt-red text-xs ml-1">✕</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assign section */}
      <div className="px-6 pb-5 flex-shrink-0 border-t border-yt-border pt-4">
        <button onClick={() => setShowAssign(v => !v)}
          className="text-sm text-yt-muted hover:text-yt-text flex items-center gap-1">
          <span>{showAssign ? '▾' : '▸'}</span> Assign video to this series
        </button>
        {showAssign && (
          <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
            {unassigned.length === 0
              ? <p className="text-xs text-yt-muted">All videos are already in a series.</p>
              : unassigned.map(v => (
                <button key={v.id} onClick={() => onAssign(v.id, series.id, episodes.length)}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-yt-muted hover:bg-yt-elevated hover:text-yt-text transition-colors">
                  {v.title}
                </button>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

interface Props { triggerNew: number }

export default function SeriesTracker({ triggerNew }: Props): React.ReactElement {
  const { series, loading, create, update, remove, refresh } = useSeries()
  const { videos, update: updateVideo, refresh: refreshVideos } = useVideos()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Series | null>(null)
  const [selected, setSelected] = useState<Series | null>(null)

  useEffect(() => { if (triggerNew > 0) setShowCreate(true) }, [triggerNew])

  const handleCreate = async (data: SeriesCreate) => { await create(data); setShowCreate(false) }
  const handleUpdate = async (data: SeriesCreate) => {
    if (!editing) return
    await update({ id: editing.id, ...data } as SeriesUpdate)
    setEditing(null)
  }

  const handleAssign = useCallback(async (videoId: number, seriesId: number, order: number) => {
    await updateVideo({ id: videoId, series_id: seriesId, episode_order: order })
    refreshVideos()
  }, [updateVideo, refreshVideos])

  const handleUnassign = useCallback(async (videoId: number) => {
    await updateVideo({ id: videoId, series_id: null })
    refreshVideos()
  }, [updateVideo, refreshVideos])

  const handleReorder = useCallback(async (videoId: number, order: number) => {
    await window.api.series.setEpisodeOrder(videoId, order)
    refreshVideos()
  }, [refreshVideos])

  const getStats = (s: Series) => {
    const eps = videos.filter(v => v.series_id === s.id)
    const pub = eps.filter(v => v.stage === 'published').length
    return { count: eps.length, published: pub }
  }

  if (selected) {
    return (
      <SeriesDetail
        series={selected}
        allVideos={videos}
        onClose={() => { setSelected(null); refresh(); refreshVideos() }}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
        onReorder={handleReorder}
      />
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-yt-border flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-yt-text">Series</h1>
          <p className="text-yt-muted text-sm mt-0.5">{series.length} series</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-yt-red hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <span>+</span> New Series
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center text-yt-muted py-16">Loading...</div>
        ) : series.length === 0 ? (
          <div className="text-center text-yt-muted py-16">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-base font-medium">No series yet</p>
            <p className="text-sm mt-1 text-yt-muted/60">Group related videos into a series to track completion.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {series.map(s => {
              const { count, published } = getStats(s)
              const pct = count ? Math.round((published / count) * 100) : 0
              return (
                <div key={s.id} onClick={() => setSelected(s)}
                  className="bg-yt-surface border border-yt-border rounded-xl p-4 hover:border-yt-red/50 cursor-pointer transition-all group">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-yt-text">{s.name}</h3>
                    <button onClick={e => { e.stopPropagation(); if (window.confirm('Delete series? Videos will keep their content.')) remove(s.id) }}
                      className="text-yt-muted hover:text-yt-red opacity-0 group-hover:opacity-100 text-xs">✕</button>
                  </div>
                  {s.description && <p className="text-xs text-yt-muted mb-3 line-clamp-2">{s.description}</p>}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-yt-muted mb-1.5">
                      <span>{count} episode{count !== 1 ? 's' : ''}</span>
                      <span>{pct}% published</span>
                    </div>
                    <div className="h-1.5 bg-yt-elevated rounded-full overflow-hidden">
                      <div className="h-full bg-yt-red rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="New Series" onClose={() => setShowCreate(false)}>
          <SeriesForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit Series" onClose={() => setEditing(null)}>
          <SeriesForm initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
