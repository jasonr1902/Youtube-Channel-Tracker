import React, { useState, useEffect, useCallback } from 'react'
import { useVideos } from '../hooks/useVideos'
import VideoCard from '../components/VideoCard'
import VideoForm from '../components/VideoForm'
import Modal from '../components/Modal'
import type { Video, VideoCreate, Stage, Priority, Series, StageEvent } from '../../../shared/types'

type FilterStage    = Stage | 'all'
type FilterPriority = Priority | 'all'
type SortKey        = 'newest' | 'oldest' | 'priority' | 'az'
type DateWindow     = 'all' | '30d' | '3m' | '6m' | '1y' | 'custom'

const STAGE_LABEL: Record<string, string> = {
  idea: 'Idea', script: 'Script', filming: 'Filming',
  editing: 'Editing', scheduled: 'Scheduled', published: 'Published'
}

const STAGE_COLOR: Record<string, string> = {
  idea: 'bg-purple-400', script: 'bg-blue-400', filming: 'bg-yellow-400',
  editing: 'bg-orange-400', scheduled: 'bg-green-400', published: 'bg-yt-red'
}

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

// Collapsible stage timeline inside the edit modal
function StageTimeline({ videoId }: { videoId: number }) {
  const [open, setOpen]     = useState(false)
  const [events, setEvents] = useState<StageEvent[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    if (loaded) return
    const evts = await window.api.videos.getStageHistory(videoId)
    setEvents(evts)
    setLoaded(true)
  }, [videoId, loaded])

  const handleToggle = () => {
    if (!open) load()
    setOpen(v => !v)
  }

  return (
    <div className="mt-4 border-t border-yt-border pt-3">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 text-xs text-yt-muted hover:text-yt-text transition-colors w-full"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        <span>Timeline</span>
        {events.length > 0 && (
          <span className="ml-1 text-yt-muted/50">({events.length} stage{events.length !== 1 ? 's' : ''})</span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-2 pl-1">
          {events.length === 0 ? (
            <p className="text-xs text-yt-muted pl-2">No stage history yet.</p>
          ) : (
            events.map((ev, i) => (
              <div key={ev.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full mt-1 ${STAGE_COLOR[ev.stage] ?? 'bg-yt-muted'}`} />
                  {i < events.length - 1 && <div className="w-px flex-1 bg-yt-border mt-1 h-3" />}
                </div>
                <div className="pb-1">
                  <p className="text-xs font-medium text-yt-text">{STAGE_LABEL[ev.stage] ?? ev.stage}</p>
                  <p className="text-xs text-yt-muted">
                    {new Date(ev.changed_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: 'numeric', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface Props { triggerNew: number }

export default function IdeaVault({ triggerNew }: Props): React.ReactElement {
  const { videos, loading, create, update, archive, remove, refresh } = useVideos()
  const [archived, setArchived]       = useState<Video[]>([])
  const [showArchive, setShowArchive] = useState(false)
  const [showCreate, setShowCreate]   = useState(false)
  const [editing, setEditing]         = useState<Video | null>(null)
  const [series, setSeries]           = useState<Series[]>([])

  // Filters + sort
  const [search,           setSearch]           = useState('')
  const [filterStage,      setFilterStage]      = useState<FilterStage>('all')
  const [filterPriority,   setFilterPriority]   = useState<FilterPriority>('all')
  const [filterSeries,     setFilterSeries]     = useState<number | 'all'>('all')
  const [sort,             setSort]             = useState<SortKey>('newest')
  const [excludePublished, setExcludePublished] = useState(false)
  const [dateWindow,       setDateWindow]       = useState<DateWindow>('all')
  const [dateFrom,         setDateFrom]         = useState('')
  const [dateTo,           setDateTo]           = useState('')

  useEffect(() => { if (triggerNew > 0) setShowCreate(true) }, [triggerNew])

  useEffect(() => {
    window.api.series.getAll().then(setSeries)
  }, [])

  const loadArchived = useCallback(async () => {
    const items = await window.api.videos.getArchived()
    setArchived(items)
  }, [])

  useEffect(() => {
    if (showArchive) loadArchived()
  }, [showArchive, loadArchived])

  const hasFilters = search || filterStage !== 'all' || filterPriority !== 'all' || filterSeries !== 'all' || sort !== 'newest' || excludePublished || dateWindow !== 'all'

  const clearFilters = () => {
    setSearch('')
    setFilterStage('all')
    setFilterPriority('all')
    setFilterSeries('all')
    setSort('newest')
    setExcludePublished(false)
    setDateWindow('all')
    setDateFrom('')
    setDateTo('')
  }

  const dateWindowCutoff = (): Date | null => {
    const now = new Date()
    if (dateWindow === '30d') return new Date(now.getTime() - 30  * 86400_000)
    if (dateWindow === '3m')  return new Date(now.getTime() - 91  * 86400_000)
    if (dateWindow === '6m')  return new Date(now.getTime() - 182 * 86400_000)
    if (dateWindow === '1y')  return new Date(now.getTime() - 365 * 86400_000)
    return null
  }

  const filtered = videos
    .filter(v => !v.archived)
    .filter(v => {
      if (search) {
        const q = search.toLowerCase()
        if (!v.title.toLowerCase().includes(q) &&
            !v.tags.toLowerCase().includes(q) &&
            !v.description.toLowerCase().includes(q)) return false
      }
      if (filterStage    !== 'all' && v.stage    !== filterStage)    return false
      if (filterPriority !== 'all' && v.priority !== filterPriority) return false
      if (filterSeries   !== 'all' && v.series_id !== filterSeries)  return false
      if (excludePublished && v.stage === 'published')               return false

      const created = new Date(v.created_at)
      if (dateWindow === 'custom') {
        if (dateFrom && created < new Date(dateFrom))     return false
        if (dateTo   && created > new Date(dateTo + 'T23:59:59')) return false
      } else {
        const cutoff = dateWindowCutoff()
        if (cutoff && created < cutoff)                   return false
      }

      return true
    })
    .sort((a, b) => {
      if (sort === 'newest')   return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'oldest')   return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sort === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (sort === 'az')       return a.title.localeCompare(b.title)
      return 0
    })

  const handleCreate = async (data: VideoCreate) => {
    await create(data)
    setShowCreate(false)
  }

  const handleUpdate = async (data: VideoCreate) => {
    if (!editing) return
    await update({ id: editing.id, ...data })
    setEditing(null)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this idea permanently?')) await remove(id)
  }

  const handleDeleteArchived = async (id: number) => {
    if (window.confirm('Delete this idea permanently? This cannot be undone.')) {
      await remove(id)
      setArchived(prev => prev.filter(v => v.id !== id))
    }
  }

  const handleArchive = async (video: Video) => {
    if (!window.confirm(`Archive "${video.title}"?\n\nYou can restore it from the Archive section at any time.`)) return
    await archive(video.id)
    setEditing(null)
    setArchived(prev =>
      prev.some(v => v.id === video.id) ? prev : [...prev, { ...video, archived: 1 as const }]
    )
  }

  const handleRestore = async (video: Video) => {
    await window.api.videos.update({ id: video.id, archived: 0 })
    setArchived(prev => prev.filter(v => v.id !== video.id))
    await refresh()
  }

  const selectClass = "bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text focus:outline-none focus:border-yt-red"

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-yt-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-yt-text">Idea Vault</h1>
            <p className="text-yt-muted text-sm mt-0.5">
              {filtered.length} of {videos.length} idea{videos.length !== 1 ? 's' : ''}
              {archived.length > 0 || showArchive ? ` · ${archived.length} archived` : ''}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-yt-red hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <span>+</span> New Idea
          </button>
        </div>

        {/* Row 1: search + sort */}
        <div className="flex gap-3 mb-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, tags, description…"
            className="flex-1 bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red"
          />
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className={selectClass}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">Priority ↓</option>
            <option value="az">A → Z</option>
          </select>
        </div>

        {/* Row 2: stage + priority + series */}
        <div className="flex gap-2 flex-wrap mb-2">
          <select value={filterStage} onChange={e => setFilterStage(e.target.value as FilterStage)} className={selectClass}>
            <option value="all">All stages</option>
            <option value="idea">💡 Idea</option>
            <option value="script">📝 Script</option>
            <option value="filming">🎥 Filming</option>
            <option value="editing">✂️ Editing</option>
            <option value="scheduled">📅 Scheduled</option>
            <option value="published">▶ Published</option>
          </select>

          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as FilterPriority)} className={selectClass}>
            <option value="all">All priorities</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">⚪ Low</option>
          </select>

          {series.length > 0 && (
            <select
              value={filterSeries === 'all' ? 'all' : String(filterSeries)}
              onChange={e => setFilterSeries(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className={selectClass}
            >
              <option value="all">All series</option>
              {series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>

        {/* Row 3: date window + exclude published + clear */}
        <div className="flex gap-2 flex-wrap items-center">
          <select value={dateWindow} onChange={e => setDateWindow(e.target.value as DateWindow)} className={selectClass}>
            <option value="all">All time</option>
            <option value="30d">Last 30 days</option>
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="1y">Last year</option>
            <option value="custom">Custom range…</option>
          </select>

          {dateWindow === 'custom' && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className={selectClass}
                placeholder="From"
              />
              <span className="text-yt-muted text-sm">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className={selectClass}
                placeholder="To"
              />
            </>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-yt-muted hover:text-yt-text transition-colors">
            <input
              type="checkbox"
              checked={excludePublished}
              onChange={e => setExcludePublished(e.target.checked)}
              className="w-3.5 h-3.5 accent-yt-red"
            />
            Exclude published
          </label>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-yt-muted hover:text-yt-red border border-yt-border hover:border-yt-red/40 rounded-lg transition-colors"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center text-yt-muted py-16">Loading…</div>
        ) : filtered.length === 0 && !hasFilters ? (
          <div className="text-center text-yt-muted py-16">
            <div className="text-4xl mb-3">💡</div>
            <p className="text-base font-medium">No ideas yet — add your first one!</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-yt-muted py-16">
            <p className="text-base font-medium">No ideas match your filters</p>
            <button onClick={clearFilters} className="text-sm text-yt-red hover:text-red-400 mt-2 transition-colors">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => setEditing(video)}
                onDelete={() => handleDelete(video.id)}
                onArchive={() => handleArchive(video)}
              />
            ))}
          </div>
        )}

        {/* Archive section */}
        <div className="mt-8">
          <button
            onClick={() => setShowArchive(v => !v)}
            className="flex items-center gap-2 text-sm text-yt-muted hover:text-yt-text transition-colors"
          >
            <span className={`transition-transform ${showArchive ? 'rotate-90' : ''}`}>▶</span>
            Archive {archived.length > 0 && `(${archived.length})`}
          </button>

          {showArchive && (
            <div className="mt-4">
              {archived.length === 0 ? (
                <p className="text-sm text-yt-muted/60 pl-4">Nothing archived yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {archived.map(video => (
                    <div key={video.id} className="relative opacity-60 hover:opacity-100 transition-opacity">
                      <VideoCard
                        video={video}
                        onClick={() => {}}
                        onDelete={() => handleDeleteArchived(video.id)}
                      />
                      <button
                        onClick={() => handleRestore(video)}
                        className="absolute top-2 right-8 text-xs text-yt-muted hover:text-green-400 transition-colors"
                        title="Restore"
                      >
                        ↩
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="New Idea" onClose={() => setShowCreate(false)}>
          <VideoForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {/* Edit modal with steps + collapsible timeline */}
      {editing && (
        <Modal title="Edit Idea" onClose={() => setEditing(null)}>
          <VideoForm
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
          <StageTimeline videoId={editing.id} />
          <div className="mt-3 pt-3 border-t border-yt-border flex justify-between items-center">
            <button
              onClick={() => handleArchive(editing)}
              className="text-xs text-yt-muted hover:text-yt-text transition-colors flex items-center gap-1"
            >
              <span>⊟</span> Archive this idea
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
