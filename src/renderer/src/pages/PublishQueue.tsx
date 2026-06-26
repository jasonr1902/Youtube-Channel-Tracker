import React, { useState, useEffect, useCallback } from 'react'
import type { QueueItem, UploadStatus, Video, StageEvent } from '../../../shared/types'
import Modal from '../components/Modal'
import UploadModal from '../components/UploadModal'

const STATUS_CONFIG: Record<UploadStatus, { label: string; color: string; bg: string }> = {
  queued:    { label: 'Queued',     color: 'text-yt-muted',    bg: 'bg-yt-elevated' },
  uploading: { label: 'Uploading',  color: 'text-blue-400',    bg: 'bg-blue-900/30' },
  scheduled: { label: 'Scheduled',  color: 'text-yellow-400',  bg: 'bg-yellow-900/30' },
  live:      { label: 'Live',       color: 'text-green-400',   bg: 'bg-green-900/30' },
  failed:    { label: 'Failed',     color: 'text-yt-red',      bg: 'bg-red-900/30' }
}

function StatusBadge({ status }: { status: UploadStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {status === 'uploading' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
      {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
      {cfg.label}
    </span>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full bg-yt-elevated rounded-full overflow-hidden mt-1">
      <div
        className="h-full bg-blue-500 rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function StageTimeline({ videoId }: { videoId: number }) {
  const [events, setEvents] = useState<StageEvent[]>([])

  useEffect(() => {
    window.api.videos.getStageHistory(videoId).then(setEvents)
  }, [videoId])

  if (events.length === 0) return <p className="text-xs text-yt-muted">No stage history.</p>

  const STAGE_LABEL: Record<string, string> = {
    idea: 'Idea', script: 'Script', filming: 'Filming',
    editing: 'Editing', scheduled: 'Scheduled', published: 'Published'
  }
  const STAGE_COLOR: Record<string, string> = {
    idea: 'bg-purple-400', script: 'bg-blue-400', filming: 'bg-yellow-400',
    editing: 'bg-orange-400', scheduled: 'bg-green-400', published: 'bg-yt-red'
  }

  return (
    <div className="space-y-2">
      {events.map((ev, i) => (
        <div key={ev.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center flex-shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full ${STAGE_COLOR[ev.stage] ?? 'bg-yt-muted'} mt-0.5`} />
            {i < events.length - 1 && <div className="w-px flex-1 bg-yt-border mt-1 h-4" />}
          </div>
          <div className="pb-1">
            <p className="text-xs font-medium text-yt-text">{STAGE_LABEL[ev.stage] ?? ev.stage}</p>
            <p className="text-xs text-yt-muted">
              {new Date(ev.changed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PublishQueuePage(): React.ReactElement {
  const [items, setItems] = useState<QueueItem[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [uploadTarget, setUploadTarget] = useState<Video | null>(null)
  const [timelineId, setTimelineId] = useState<number | null>(null)
  const [auth, setAuth] = useState(false)

  const loadQueue = useCallback(async () => {
    const [q, v] = await Promise.all([window.api.upload.getQueue(), window.api.videos.getAll()])
    setItems(q)
    setVideos(v)
  }, [])

  useEffect(() => {
    window.api.auth.getState().then(s => setAuth(s.connected))
    loadQueue()

    const offProgress = window.api.upload.onProgress(({ queueItemId, progress }) => {
      setItems(prev => prev.map(i => i.id === queueItemId ? { ...i, progress } : i))
    })
    const offUpdate = window.api.upload.onQueueUpdate(setItems)
    return () => { offProgress(); offUpdate() }
  }, [loadQueue])

  const videoTitle = (videoId: number) => videos.find(v => v.id === videoId)?.title ?? `Video #${videoId}`

  const pending = items.filter(i => i.status === 'queued').length
  const active  = items.filter(i => i.status === 'uploading').length
  const done    = items.filter(i => i.status === 'live' || i.status === 'scheduled').length

  const handleStart = async (id: number) => {
    await window.api.upload.startUpload(id)
  }

  const handleRemove = async (id: number) => {
    if (!window.confirm('Remove this item from the queue?')) return
    await window.api.upload.removeFromQueue(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const timelineVideo = timelineId !== null ? videos.find(v => v.id === timelineId) : null

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-yt-border flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-yt-text">Publish Queue</h1>
          <p className="text-yt-muted text-sm mt-0.5">
            {pending} pending · {active} uploading · {done} done
          </p>
        </div>
        {auth && (
          <button
            onClick={() => {
              window.api.videos.getAll().then(vs => {
                const target = vs.find(v => v.stage !== 'published')
                if (target) setUploadTarget(target)
              })
            }}
            className="flex items-center gap-2 bg-yt-red hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <span>↑</span> New Upload
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!auth && (
          <div className="text-center py-16 text-yt-muted">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-base font-medium">YouTube not connected</p>
            <p className="text-sm mt-1 text-yt-muted/60">Connect your channel in Settings to upload videos.</p>
          </div>
        )}

        {auth && items.length === 0 && (
          <div className="text-center py-16 text-yt-muted">
            <div className="text-4xl mb-3">📤</div>
            <p className="text-base font-medium">No uploads queued</p>
            <p className="text-sm mt-1 text-yt-muted/60">Click "New Upload" or use the ↑ button on a Pipeline card.</p>
          </div>
        )}

        {auth && items.length > 0 && (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-yt-surface border border-yt-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-yt-text truncate">{item.yt_title}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-xs text-yt-muted mt-0.5">
                      {videoTitle(item.video_id)}
                      {item.publish_at && (
                        <span className="ml-2">
                          · Publishes {new Date(item.publish_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </p>

                    {item.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-yt-muted">
                          <span>Uploading…</span>
                          <span>{item.progress}%</span>
                        </div>
                        <ProgressBar pct={item.progress} />
                      </div>
                    )}

                    {item.status === 'failed' && item.error_message && (
                      <p className="text-xs text-red-400 mt-1 break-all">{item.error_message}</p>
                    )}

                    {item.youtube_video_id && (
                      <p className="text-xs text-yt-muted mt-1 font-mono">{item.youtube_video_id}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Stage timeline */}
                    <button
                      onClick={() => setTimelineId(item.video_id)}
                      className="text-xs text-yt-muted hover:text-yt-text px-2 py-1 rounded hover:bg-yt-elevated transition-colors"
                      title="Stage history"
                    >
                      ⏱
                    </button>

                    {/* View on YouTube */}
                    {item.youtube_video_id && (
                      <a
                        href={`https://youtube.com/watch?v=${item.youtube_video_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-yt-muted hover:text-yt-red px-2 py-1 rounded hover:bg-yt-elevated transition-colors"
                        title="View on YouTube"
                      >
                        ▶
                      </a>
                    )}

                    {/* Start / Retry */}
                    {(item.status === 'queued' || item.status === 'failed') && (
                      <button
                        onClick={() => handleStart(item.id)}
                        className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-yt-elevated transition-colors"
                        title={item.status === 'failed' ? 'Retry' : 'Start now'}
                      >
                        {item.status === 'failed' ? '↻' : '▶'}
                      </button>
                    )}

                    {/* Remove */}
                    {item.status !== 'uploading' && (
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="text-xs text-yt-muted hover:text-yt-red px-2 py-1 rounded hover:bg-yt-elevated transition-colors"
                        title="Remove"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New upload modal */}
      {uploadTarget && (
        <Modal title={`Upload "${uploadTarget.title}" to YouTube`} onClose={() => setUploadTarget(null)} wide>
          <UploadModal
            video={uploadTarget}
            onQueued={(item) => {
              setItems(prev => [item, ...prev.filter(i => i.id !== item.id)])
              setUploadTarget(null)
            }}
            onCancel={() => setUploadTarget(null)}
          />
        </Modal>
      )}

      {/* Stage timeline modal */}
      {timelineId !== null && (
        <Modal
          title={`Stage History${timelineVideo ? ` — ${timelineVideo.title}` : ''}`}
          onClose={() => setTimelineId(null)}
        >
          <StageTimeline videoId={timelineId} />
        </Modal>
      )}
    </div>
  )
}
