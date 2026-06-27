import React from 'react'
import type { Video, Stage, Priority } from '../../../shared/types'

interface VideoCardProps {
  video: Video
  onClick: () => void
  onDelete: () => void
  onArchive?: () => void
}

const stageDot: Record<Stage, string> = {
  idea:      'bg-purple-400',
  script:    'bg-blue-400',
  filming:   'bg-yellow-400',
  editing:   'bg-orange-400',
  scheduled: 'bg-green-400',
  published: 'bg-yt-red'
}

const stageLabel: Record<Stage, string> = {
  idea: 'Idea', script: 'Script', filming: 'Filming',
  editing: 'Editing', scheduled: 'Scheduled', published: 'Published'
}

const priorityBadge: Record<Priority, { text: string; className: string }> = {
  high:   { text: 'High',   className: 'text-yt-red bg-red-900/30' },
  medium: { text: 'Med',    className: 'text-yellow-400 bg-yellow-900/30' },
  low:    { text: 'Low',    className: 'text-yt-muted bg-yt-elevated' }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function VideoCard({ video, onClick, onDelete, onArchive }: VideoCardProps): React.ReactElement {
  const tags = video.tags ? video.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  const dot   = stageDot[video.stage]
  const badge = priorityBadge[video.priority]

  return (
    <div
      onClick={onClick}
      className="bg-yt-surface border border-yt-border rounded-xl hover:border-yt-red/50 cursor-pointer transition-all group flex flex-col max-h-48"
    >
      {/* Title row — always visible */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-1 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${dot}`} title={stageLabel[video.stage]} />
          <h3 className="font-medium text-sm text-yt-text leading-snug">{video.title}</h3>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {onArchive && (
            <button
              onClick={e => { e.stopPropagation(); onArchive() }}
              className="text-xs text-yt-muted hover:text-yt-text px-1"
              title="Archive"
            >
              ⊟
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="text-xs text-yt-muted hover:text-yt-red px-1"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 min-h-0">
        {video.description && (
          <p className="text-xs text-yt-muted mb-2 pl-4">{video.description}</p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pl-4 mb-2">
            {tags.map(tag => (
              <span key={tag} className="text-xs bg-yt-elevated text-yt-muted/80 px-2 py-0.5 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer — always visible */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1 flex-shrink-0">
        <div className="flex items-center gap-2 pl-4">
          <span className="text-xs text-yt-muted">{stageLabel[video.stage]}</span>
          {video.script_path && (
            <span className="text-xs text-yt-muted/60" title="Script attached">📄</span>
          )}
          {video.assets_folder_path && (
            <span className="text-xs text-yt-muted/60" title="Assets folder linked">📁</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badge.className}`}>
            {badge.text}
          </span>
          <span className="text-xs text-yt-muted/50">{fmtDate(video.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
