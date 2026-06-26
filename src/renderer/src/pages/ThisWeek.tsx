import React, { useMemo } from 'react'
import { useVideos } from '../hooks/useVideos'
import type { Video, Stage } from '../../../shared/types'

const STAGE_ORDER: Stage[] = ['idea', 'script', 'filming', 'editing', 'scheduled', 'published']

const stageNext: Partial<Record<Stage, Stage>> = {
  idea: 'script', script: 'filming', filming: 'editing',
  editing: 'scheduled', scheduled: 'published'
}

const stageBadge: Record<Stage, string> = {
  idea:      'bg-purple-900/50 text-purple-300',
  script:    'bg-blue-900/50 text-blue-300',
  filming:   'bg-yellow-900/50 text-yellow-300',
  editing:   'bg-orange-900/50 text-orange-300',
  scheduled: 'bg-green-900/50 text-green-300',
  published: 'bg-yt-red/20 text-red-300'
}

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function endOfWeek(d: Date): Date {
  const start = startOfWeek(d)
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isOverdue(video: Video, todayKey: string): boolean {
  return (
    video.scheduled_date !== null &&
    video.scheduled_date < todayKey &&
    video.stage !== 'published'
  )
}

function isThisWeek(video: Video, weekStart: string, weekEnd: string): boolean {
  return (
    video.scheduled_date !== null &&
    video.scheduled_date >= weekStart &&
    video.scheduled_date <= weekEnd
  )
}

function urgencyLabel(video: Video, todayKey: string): { text: string; color: string } {
  if (!video.scheduled_date) return { text: '', color: '' }
  const days = Math.ceil(
    (new Date(video.scheduled_date + 'T12:00:00').getTime() - new Date(todayKey + 'T12:00:00').getTime()) / 86400000
  )
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, color: 'text-yt-red' }
  if (days === 0) return { text: 'Today', color: 'text-yellow-400' }
  if (days === 1) return { text: 'Tomorrow', color: 'text-yellow-400' }
  return { text: `in ${days}d`, color: 'text-yt-muted' }
}

interface VideoRowProps {
  video: Video
  todayKey: string
  onAdvance: (id: number, stage: Stage) => void
}

function VideoRow({ video, todayKey, onAdvance }: VideoRowProps) {
  const next = stageNext[video.stage]
  const { text: urgText, color: urgColor } = urgencyLabel(video, todayKey)
  const stageIdx = STAGE_ORDER.indexOf(video.stage)

  return (
    <div className="flex items-center gap-3 bg-yt-surface border border-yt-border rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-yt-text truncate">{video.title}</span>
          {urgText && <span className={`text-xs flex-shrink-0 ${urgColor}`}>{urgText}</span>}
        </div>
        {/* Stage progress dots */}
        <div className="flex items-center gap-1">
          {STAGE_ORDER.map((s, i) => (
            <div key={s} className={`h-1 rounded-full flex-1 ${i <= stageIdx ? 'bg-yt-red' : 'bg-yt-elevated'}`} />
          ))}
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded capitalize ${stageBadge[video.stage]}`}>
            {video.stage}
          </span>
        </div>
      </div>
      {next && (
        <button
          onClick={() => onAdvance(video.id, next)}
          className="flex-shrink-0 text-xs text-yt-muted border border-yt-border hover:border-yt-red/50 hover:text-yt-text px-3 py-1.5 rounded-lg transition-colors capitalize whitespace-nowrap"
        >
          → {next}
        </button>
      )}
    </div>
  )
}

export default function ThisWeek(): React.ReactElement {
  const { videos, loading, update } = useVideos()

  const today = new Date()
  const todayKey = toDateKey(today)
  const weekStart = toDateKey(startOfWeek(today))
  const weekEnd = toDateKey(endOfWeek(today))

  const { overdue, thisWeek, inProgress, stats } = useMemo(() => {
    const overdue = videos.filter(v => isOverdue(v, todayKey)).sort((a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!))
    const thisWeek = videos.filter(v => isThisWeek(v, weekStart, weekEnd) && v.stage !== 'published')
    const inProgress = videos
      .filter(v => !v.scheduled_date && v.stage !== 'idea' && v.stage !== 'published')
      .sort((a, b) => STAGE_ORDER.indexOf(b.stage) - STAGE_ORDER.indexOf(a.stage))

    const published = videos.filter(v => v.stage === 'published').length
    const active = videos.filter(v => v.stage !== 'published').length
    const scheduled = videos.filter(v => v.scheduled_date && v.stage !== 'published').length

    return { overdue, thisWeek, inProgress, stats: { published, active, scheduled } }
  }, [videos, todayKey, weekStart, weekEnd])

  const advance = async (id: number, stage: Stage) => {
    await update({ id, stage })
  }

  const weekRange = `${new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(weekEnd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-yt-border flex-shrink-0">
        <h1 className="text-2xl font-bold text-yt-text">This Week</h1>
        <p className="text-yt-muted text-sm mt-0.5">{weekRange}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {loading ? (
          <div className="text-center text-yt-muted py-16">Loading...</div>
        ) : (
          <>
            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Published', value: stats.published, color: 'text-yt-red' },
                { label: 'In Progress', value: stats.active, color: 'text-yellow-400' },
                { label: 'Scheduled', value: stats.scheduled, color: 'text-green-400' }
              ].map(s => (
                <div key={s.label} className="bg-yt-surface border border-yt-border rounded-xl p-4 text-center">
                  <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-yt-muted mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Overdue */}
            {overdue.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-yt-red font-semibold text-sm">⚠ Overdue</span>
                  <span className="text-xs text-yt-muted bg-yt-elevated px-2 py-0.5 rounded-full">{overdue.length}</span>
                </div>
                <div className="space-y-2">
                  {overdue.map(v => (
                    <VideoRow key={v.id} video={v} todayKey={todayKey} onAdvance={advance} />
                  ))}
                </div>
              </section>
            )}

            {/* This week */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-yt-text font-semibold text-sm">📅 Scheduled This Week</span>
                <span className="text-xs text-yt-muted bg-yt-elevated px-2 py-0.5 rounded-full">{thisWeek.length}</span>
              </div>
              {thisWeek.length === 0 ? (
                <p className="text-sm text-yt-muted/60">Nothing scheduled this week. Head to Calendar to plan your week.</p>
              ) : (
                <div className="space-y-2">
                  {thisWeek.map(v => (
                    <VideoRow key={v.id} video={v} todayKey={todayKey} onAdvance={advance} />
                  ))}
                </div>
              )}
            </section>

            {/* In progress (unscheduled) */}
            {inProgress.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-yt-text font-semibold text-sm">🎬 In Production</span>
                  <span className="text-xs text-yt-muted bg-yt-elevated px-2 py-0.5 rounded-full">{inProgress.length}</span>
                </div>
                <div className="space-y-2">
                  {inProgress.map(v => (
                    <VideoRow key={v.id} video={v} todayKey={todayKey} onAdvance={advance} />
                  ))}
                </div>
              </section>
            )}

            {overdue.length === 0 && thisWeek.length === 0 && inProgress.length === 0 && (
              <div className="text-center text-yt-muted py-16">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-base font-medium">All clear!</p>
                <p className="text-sm mt-1 text-yt-muted/60">No overdue or in-progress videos.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
