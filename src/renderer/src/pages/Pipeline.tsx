import React, { useRef, useState, useEffect } from 'react'
import { useVideos } from '../hooks/useVideos'
import KanbanColumn from '../components/KanbanColumn'
import VideoForm from '../components/VideoForm'
import Modal from '../components/Modal'
import UploadModal from '../components/UploadModal'
import type { Video, VideoCreate, Stage, StageEvent } from '../../../shared/types'

const COLUMNS: { stage: Stage; label: string; color: string }[] = [
  { stage: 'idea',      label: 'Idea',      color: 'bg-purple-400' },
  { stage: 'script',    label: 'Script',    color: 'bg-blue-400' },
  { stage: 'filming',   label: 'Filming',   color: 'bg-yellow-400' },
  { stage: 'editing',   label: 'Editing',   color: 'bg-orange-400' },
  { stage: 'scheduled', label: 'Scheduled', color: 'bg-green-400' },
  { stage: 'published', label: 'Published', color: 'bg-yt-red' }
]

const STAGE_COLOR: Record<string, string> = {
  idea: 'bg-purple-400', script: 'bg-blue-400', filming: 'bg-yellow-400',
  editing: 'bg-orange-400', scheduled: 'bg-green-400', published: 'bg-yt-red'
}
const STAGE_LABEL: Record<string, string> = {
  idea: 'Idea', script: 'Script', filming: 'Filming',
  editing: 'Editing', scheduled: 'Scheduled', published: 'Published'
}

function StageTimeline({ videoId, onClose }: { videoId: number; onClose: () => void }) {
  const [events, setEvents] = useState<StageEvent[]>([])

  useEffect(() => {
    window.api.videos.getStageHistory(videoId).then(setEvents)
  }, [videoId])

  return (
    <div className="space-y-2 min-h-[4rem]">
      {events.length === 0 && <p className="text-sm text-yt-muted">No stage transitions recorded yet.</p>}
      {events.map((ev, i) => (
        <div key={ev.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center flex-shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full mt-0.5 ${STAGE_COLOR[ev.stage] ?? 'bg-yt-muted'}`} />
            {i < events.length - 1 && <div className="w-px h-4 bg-yt-border mt-1" />}
          </div>
          <div className="pb-1">
            <p className="text-sm font-medium text-yt-text">{STAGE_LABEL[ev.stage] ?? ev.stage}</p>
            <p className="text-xs text-yt-muted">
              {new Date(ev.changed_at).toLocaleString('en-US', {
                month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="text-sm text-yt-muted hover:text-yt-text px-3 py-1.5 rounded-lg hover:bg-yt-elevated transition-colors">
          Close
        </button>
      </div>
    </div>
  )
}

interface Props { triggerNew: number }

export default function Pipeline({ triggerNew }: Props): React.ReactElement {
  const { videos, loading, create, update, remove } = useVideos()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Video | null>(null)
  const [uploadTarget, setUploadTarget] = useState<Video | null>(null)
  const [timelineTarget, setTimelineTarget] = useState<Video | null>(null)
  const dragId = useRef<number | null>(null)

  useEffect(() => { if (triggerNew > 0) setShowCreate(true) }, [triggerNew])

  const byStage = (stage: Stage) => videos.filter(v => v.stage === stage)

  const handleDrop = async (targetStage: Stage) => {
    if (dragId.current === null) return
    const video = videos.find(v => v.id === dragId.current)
    if (!video || video.stage === targetStage) return
    await update({ id: video.id, stage: targetStage })
    dragId.current = null
  }

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
    if (window.confirm('Delete this video?')) await remove(id)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-yt-border flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-yt-text">Pipeline</h1>
          <p className="text-yt-muted text-sm mt-0.5">
            {videos.length} video{videos.length !== 1 ? 's' : ''} in production
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-yt-red hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <span>+</span> New Video
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full text-yt-muted">Loading...</div>
        ) : (
          <div className="flex gap-4 p-6 h-full">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.stage}
                stage={col.stage}
                label={col.label}
                color={col.color}
                videos={byStage(col.stage)}
                onEdit={setEditing}
                onDelete={handleDelete}
                onUpload={setUploadTarget}
                onDragStart={(id) => { dragId.current = id }}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="New Video" onClose={() => setShowCreate(false)}>
          <VideoForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {/* Edit modal — includes timeline link */}
      {editing && (
        <Modal title="Edit Video" onClose={() => setEditing(null)}>
          <VideoForm
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
          <div className="mt-4 pt-4 border-t border-yt-border flex items-center justify-between">
            <button
              onClick={() => { setTimelineTarget(editing); setEditing(null) }}
              className="text-xs text-yt-muted hover:text-yt-text flex items-center gap-1.5 transition-colors"
            >
              <span>⏱</span> Stage history
            </button>
            <button
              onClick={() => { setUploadTarget(editing); setEditing(null) }}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors"
            >
              <span>↑</span> Upload to YouTube
            </button>
          </div>
        </Modal>
      )}

      {/* Upload modal */}
      {uploadTarget && (
        <Modal title={`Upload "${uploadTarget.title}" to YouTube`} onClose={() => setUploadTarget(null)} wide>
          <UploadModal
            video={uploadTarget}
            onQueued={() => setUploadTarget(null)}
            onCancel={() => setUploadTarget(null)}
          />
        </Modal>
      )}

      {/* Stage timeline modal */}
      {timelineTarget && (
        <Modal title={`Stage History — ${timelineTarget.title}`} onClose={() => setTimelineTarget(null)}>
          <StageTimeline videoId={timelineTarget.id} onClose={() => setTimelineTarget(null)} />
        </Modal>
      )}
    </div>
  )
}
