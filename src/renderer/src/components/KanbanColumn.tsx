import React, { useState } from 'react'
import type { Video, Stage } from '../../../shared/types'
import KanbanCard from './KanbanCard'

interface KanbanColumnProps {
  stage: Stage
  label: string
  color: string
  videos: Video[]
  onEdit: (v: Video) => void
  onDelete: (id: number) => void
  onUpload: (v: Video) => void
  onDragStart: (id: number) => void
  onDrop: (stage: Stage) => void
}

export default function KanbanColumn({
  stage, label, color, videos,
  onEdit, onDelete, onUpload, onDragStart, onDrop
}: KanbanColumnProps): React.ReactElement {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDrop(stage)
  }

  return (
    <div className="flex flex-col w-56 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-sm font-semibold text-yt-text">{label}</span>
        <span className="ml-auto text-xs text-yt-muted bg-yt-elevated px-1.5 py-0.5 rounded-full">
          {videos.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 min-h-24 rounded-xl p-2 space-y-2 transition-colors ${
          isDragOver
            ? 'bg-yt-elevated border-2 border-dashed border-yt-red/50'
            : 'bg-yt-surface/40 border-2 border-dashed border-transparent'
        }`}
      >
        {videos.map(v => (
          <KanbanCard
            key={v.id}
            video={v}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpload={onUpload}
            onDragStart={onDragStart}
          />
        ))}
        {videos.length === 0 && (
          <div className="text-center text-yt-muted/40 text-xs py-4">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}
