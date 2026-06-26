import React, { useState, useMemo } from 'react'
import { useVideos } from '../hooks/useVideos'
import Modal from '../components/Modal'
import type { Video } from '../../../shared/types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const stageColor: Record<string, string> = {
  idea:      'bg-purple-900/50 text-purple-300 border-purple-700/40',
  script:    'bg-blue-900/50 text-blue-300 border-blue-700/40',
  filming:   'bg-yellow-900/50 text-yellow-300 border-yellow-700/40',
  editing:   'bg-orange-900/50 text-orange-300 border-orange-700/40',
  scheduled: 'bg-green-900/50 text-green-300 border-green-700/40',
  published: 'bg-red-900/50 text-red-300 border-red-700/40'
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface ScheduleModalProps {
  date: string
  scheduledVideo?: Video
  unscheduled: Video[]
  onSchedule: (videoId: number, date: string) => Promise<void>
  onUnschedule: (videoId: number) => Promise<void>
  onClose: () => void
}

function ScheduleModal({ date, scheduledVideo, unscheduled, onSchedule, onUnschedule, onClose }: ScheduleModalProps) {
  const [selectedId, setSelectedId] = useState<number | ''>('')
  const label = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-4">
      <p className="text-sm text-yt-muted">{label}</p>
      {scheduledVideo && (
        <div className="bg-yt-elevated border border-yt-border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-yt-muted mb-0.5">Currently scheduled</p>
              <p className="text-sm font-medium text-yt-text">{scheduledVideo.title}</p>
            </div>
            <button onClick={() => onUnschedule(scheduledVideo.id).then(onClose)}
              className="text-xs text-yt-muted hover:text-yt-red px-2 py-1 rounded border border-yt-border hover:border-yt-red/40">
              Remove
            </button>
          </div>
        </div>
      )}
      <div>
        <label className="block text-xs text-yt-muted mb-1.5">
          {scheduledVideo ? 'Schedule another video' : 'Schedule a video'}
        </label>
        <select value={selectedId} onChange={e => setSelectedId(Number(e.target.value) || '')}
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text focus:outline-none focus:border-yt-red">
          <option value="">Select a video...</option>
          {unscheduled.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-yt-muted hover:text-yt-text">Cancel</button>
        <button
          disabled={!selectedId}
          onClick={() => selectedId && onSchedule(selectedId as number, date).then(onClose)}
          className="px-4 py-2 text-sm bg-yt-red hover:bg-red-600 disabled:opacity-40 text-white rounded-lg font-medium transition-colors">
          Schedule
        </button>
      </div>
    </div>
  )
}

interface Props { triggerNew: number }

export default function CalendarPage({ triggerNew }: Props): React.ReactElement {
  const { videos, update } = useVideos()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  const scheduled = useMemo(() =>
    videos.filter(v => v.scheduled_date), [videos])

  const unscheduled = useMemo(() =>
    videos.filter(v => !v.scheduled_date), [videos])

  const byDate = useMemo(() => {
    const map: Record<string, Video[]> = {}
    scheduled.forEach(v => {
      const key = v.scheduled_date!.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(v)
    })
    return map
  }, [scheduled])

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const scheduleVideo = async (videoId: number, date: string) => {
    await update({ id: videoId, scheduled_date: date, stage: 'scheduled' })
  }
  const unscheduleVideo = async (videoId: number) => {
    await update({ id: videoId, scheduled_date: null })
  }

  const handleCellDrop = async (dateKey: string) => {
    if (draggingId === null) return
    await scheduleVideo(draggingId, dateKey)
    setDraggingId(null)
    setDragOverDate(null)
  }

  const todayKey = toDateKey(today)
  const selectedVideo = selectedDate ? (byDate[selectedDate] ?? [])[0] : undefined

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-yt-border flex items-center gap-4 flex-shrink-0">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-yt-text">Calendar</h1>
          <p className="text-yt-muted text-sm mt-0.5">{scheduled.length} video{scheduled.length !== 1 ? 's' : ''} scheduled</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="text-yt-muted hover:text-yt-text text-lg px-2">‹</button>
          <span className="text-yt-text font-semibold w-40 text-center">
            {MONTH_LABELS[month]} {year}
          </span>
          <button onClick={nextMonth} className="text-yt-muted hover:text-yt-text text-lg px-2">›</button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
            className="text-xs text-yt-muted border border-yt-border hover:border-yt-red/40 hover:text-yt-text px-3 py-1.5 rounded-lg transition-colors">
            Today
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-yt-muted py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayVideos = byDate[dateKey] ?? []
              const isToday = dateKey === todayKey
              const isDragTarget = dragOverDate === dateKey

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  onDragOver={e => { e.preventDefault(); setDragOverDate(dateKey) }}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={() => handleCellDrop(dateKey)}
                  className={`min-h-20 rounded-lg p-1.5 cursor-pointer transition-all border ${
                    isDragTarget
                      ? 'border-yt-red/50 bg-yt-elevated'
                      : isToday
                      ? 'border-yt-red/30 bg-yt-surface'
                      : 'border-yt-border/30 bg-yt-surface/40 hover:bg-yt-surface hover:border-yt-border'
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-yt-red text-white' : 'text-yt-muted'
                  }`}>{day}</div>
                  {dayVideos.slice(0, 2).map(v => (
                    <div key={v.id} className={`text-xs px-1 py-0.5 rounded border mb-0.5 truncate ${stageColor[v.stage]}`}>
                      {v.title}
                    </div>
                  ))}
                  {dayVideos.length > 2 && (
                    <div className="text-xs text-yt-muted/60">+{dayVideos.length - 2} more</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Unscheduled sidebar */}
        <div className="w-52 border-l border-yt-border flex flex-col flex-shrink-0">
          <div className="px-3 py-3 border-b border-yt-border">
            <p className="text-xs font-semibold text-yt-muted uppercase tracking-wider">Unscheduled</p>
            <p className="text-xs text-yt-muted/60 mt-0.5">{unscheduled.length} videos — drag to schedule</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {unscheduled.map(v => (
              <div
                key={v.id}
                draggable
                onDragStart={() => setDraggingId(v.id)}
                onDragEnd={() => { setDraggingId(null); setDragOverDate(null) }}
                className="bg-yt-elevated border border-yt-border rounded-lg px-2.5 py-2 text-xs text-yt-text cursor-grab active:cursor-grabbing hover:border-yt-red/40 select-none"
              >
                <div className="font-medium truncate">{v.title}</div>
                <div className="text-yt-muted capitalize mt-0.5">{v.stage}</div>
              </div>
            ))}
            {unscheduled.length === 0 && (
              <p className="text-xs text-yt-muted/40 text-center py-4">All videos scheduled!</p>
            )}
          </div>
        </div>
      </div>

      {selectedDate && (
        <Modal
          title={`Schedule for ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
          onClose={() => setSelectedDate(null)}
        >
          <ScheduleModal
            date={selectedDate}
            scheduledVideo={selectedVideo}
            unscheduled={unscheduled}
            onSchedule={scheduleVideo}
            onUnschedule={unscheduleVideo}
            onClose={() => setSelectedDate(null)}
          />
        </Modal>
      )}
    </div>
  )
}
