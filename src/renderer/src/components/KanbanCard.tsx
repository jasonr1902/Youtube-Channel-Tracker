import React, { useRef } from 'react'
import type { Video, Priority } from '../../../shared/types'

interface KanbanCardProps {
  video: Video
  onEdit: (v: Video) => void
  onDelete: (id: number) => void
  onUpload: (v: Video) => void
  onDragStart: (id: number) => void
}

const priorityDot: Record<Priority, string> = {
  low: 'bg-yt-muted',
  medium: 'bg-yellow-400',
  high: 'bg-yt-red'
}

export default function KanbanCard({ video, onEdit, onDelete, onUpload, onDragStart }: KanbanCardProps): React.ReactElement {
  const tags = video.tags ? video.tags.split(',').map(t => t.trim()).filter(Boolean) : []

  return (
    <div
      draggable
      onDragStart={() => onDragStart(video.id)}
      onClick={() => onEdit(video)}
      className="bg-yt-elevated border border-yt-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-yt-red/40 transition-all group select-none"
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${priorityDot[video.priority]}`} />
          <span className="text-sm font-medium text-yt-text leading-snug">{video.title}</span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onUpload(video) }}
            className="text-yt-muted hover:text-blue-400 text-xs px-1"
            title="Upload to YouTube"
          >
            ↑
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(video.id) }}
            className="text-yt-muted hover:text-yt-red text-xs px-1"
          >
            ✕
          </button>
        </div>
      </div>

      {video.description && (
        <p className="text-xs text-yt-muted line-clamp-2 mb-1.5 pl-3">{video.description}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-3">
          {tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-yt-surface text-yt-muted/80 px-1.5 py-0.5 rounded">
              #{tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-yt-muted/60">+{tags.length - 3}</span>
          )}
        </div>
      )}

      {video.youtube_video_id && (
        <div className="mt-1.5 pl-3">
          <span className="text-xs text-yt-red/70">▶ Published</span>
        </div>
      )}
    </div>
  )
}
