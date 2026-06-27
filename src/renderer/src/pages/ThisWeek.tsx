import React, { useState, useEffect, useMemo } from 'react'
import { useVideos } from '../hooks/useVideos'
import type { Video, Stage, Goal, UserProfile } from '../../../shared/types'

// ─── Date helpers ──────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function startOfWeek(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay())
}
function endOfWeek(d: Date): Date {
  const s = startOfWeek(d)
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6)
}
function daysBetween(a: string, b: string): number {
  return Math.ceil((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000)
}

// ─── Stage config ──────────────────────────────────────────────────────────

const STAGE_ORDER: Stage[] = ['idea', 'script', 'filming', 'editing', 'scheduled', 'published']
const STAGE_NEXT: Partial<Record<Stage, Stage>> = {
  idea: 'script', script: 'filming', filming: 'editing',
  editing: 'scheduled', scheduled: 'published'
}
const STAGE_DOT: Record<Stage, string> = {
  idea: 'bg-purple-400', script: 'bg-blue-400', filming: 'bg-yellow-400',
  editing: 'bg-orange-400', scheduled: 'bg-green-400', published: 'bg-yt-red'
}
const STAGE_BADGE: Record<Stage, string> = {
  idea:      'bg-purple-900/40 text-purple-300',
  script:    'bg-blue-900/40 text-blue-300',
  filming:   'bg-yellow-900/40 text-yellow-300',
  editing:   'bg-orange-900/40 text-orange-300',
  scheduled: 'bg-green-900/40 text-green-300',
  published: 'bg-yt-red/20 text-red-300'
}
const STAGE_COLOR: Record<Stage, string> = {
  idea: 'text-purple-400', script: 'text-blue-400', filming: 'text-yellow-400',
  editing: 'text-orange-400', scheduled: 'text-green-400', published: 'text-yt-red'
}

// ─── Widget registry ───────────────────────────────────────────────────────

const WIDGET_IDS = ['pipeline', 'week', 'production', 'xp', 'goals', 'recent'] as const
type WidgetId = typeof WIDGET_IDS[number]

const WIDGET_META: Record<WidgetId, { label: string; icon: string }> = {
  pipeline:   { label: 'Pipeline Overview', icon: '📊' },
  week:       { label: 'This Week',         icon: '📅' },
  production: { label: 'In Production',     icon: '🎬' },
  xp:         { label: 'XP & Level',        icon: '🎮' },
  goals:      { label: 'Goals',             icon: '🎯' },
  recent:     { label: 'Recent Ideas',      icon: '💡' },
}

const DEFAULT_ENABLED: Record<WidgetId, boolean> = {
  pipeline: true, week: true, production: true, xp: true, goals: true, recent: true
}

function loadConfig(): Record<WidgetId, boolean> {
  try {
    const s = localStorage.getItem('dashboard_widgets')
    if (s) return { ...DEFAULT_ENABLED, ...JSON.parse(s) }
  } catch {}
  return { ...DEFAULT_ENABLED }
}

function saveConfig(cfg: Record<WidgetId, boolean>) {
  localStorage.setItem('dashboard_widgets', JSON.stringify(cfg))
}

// ─── Shared sub-components ─────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-yt-muted uppercase tracking-widest mb-3">{children}</h3>
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-yt-muted/60 py-2">{text}</p>
}

function VideoRow({ video, todayKey, onAdvance }: {
  video: Video; todayKey: string
  onAdvance: (id: number, stage: Stage) => void
}) {
  const next = STAGE_NEXT[video.stage]
  const days = video.scheduled_date ? daysBetween(todayKey, video.scheduled_date) : null
  const urgText = days === null ? '' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days}d`
  const urgColor = days !== null && days < 0 ? 'text-yt-red' : days !== null && days <= 1 ? 'text-yellow-400' : 'text-yt-muted'
  const stageIdx = STAGE_ORDER.indexOf(video.stage)

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-yt-border/40 last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${STAGE_DOT[video.stage]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-yt-text truncate">{video.title}</span>
          {urgText && <span className={`text-xs flex-shrink-0 font-medium ${urgColor}`}>{urgText}</span>}
        </div>
        <div className="flex items-center gap-0.5">
          {STAGE_ORDER.map((_, i) => (
            <div key={i} className={`h-0.5 rounded-full flex-1 ${i <= stageIdx ? 'bg-yt-red/70' : 'bg-yt-elevated'}`} />
          ))}
        </div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded capitalize flex-shrink-0 ${STAGE_BADGE[video.stage]}`}>
        {video.stage}
      </span>
      {next && (
        <button
          onClick={() => onAdvance(video.id, next)}
          className="text-xs text-yt-muted border border-yt-border hover:border-yt-red/50 hover:text-yt-text px-2.5 py-1 rounded-lg transition-colors capitalize whitespace-nowrap flex-shrink-0"
        >
          → {next}
        </button>
      )}
    </div>
  )
}

// ─── Widget wrapper ────────────────────────────────────────────────────────

function WidgetCard({ id, children, span = 1 }: {
  id: WidgetId; children: React.ReactNode; span?: 1 | 2
}) {
  const { label, icon } = WIDGET_META[id]
  return (
    <div className={`bg-yt-surface border border-yt-border rounded-2xl overflow-hidden ${span === 2 ? 'col-span-2' : 'col-span-1'}`}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-yt-border">
        <span className="text-base leading-none">{icon}</span>
        <h2 className="text-sm font-semibold text-yt-text">{label}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Individual widgets ────────────────────────────────────────────────────

function PipelineWidget({ stageCounts }: { stageCounts: Record<Stage, number> }) {
  const total = Object.values(stageCounts).reduce((a, b) => a + b, 0)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-2">
        {STAGE_ORDER.map(stage => (
          <div key={stage} className="text-center">
            <div className={`text-2xl font-bold ${STAGE_COLOR[stage]}`}>{stageCounts[stage]}</div>
            <div className="text-xs text-yt-muted capitalize mt-0.5">{stage}</div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden gap-px">
          {STAGE_ORDER.map(stage => stageCounts[stage] > 0 ? (
            <div
              key={stage}
              className={`${STAGE_DOT[stage]} transition-all`}
              style={{ flex: stageCounts[stage] }}
              title={`${stage}: ${stageCounts[stage]}`}
            />
          ) : null)}
        </div>
      )}
    </div>
  )
}

function WeekWidget({ overdue, thisWeek, todayKey, weekRange, onAdvance }: {
  overdue: Video[]; thisWeek: Video[]; todayKey: string
  weekRange: string; onAdvance: (id: number, stage: Stage) => void
}) {
  const all = [...overdue, ...thisWeek.filter(v => !overdue.includes(v))]
  return (
    <div>
      <p className="text-xs text-yt-muted mb-3">{weekRange}</p>
      {all.length === 0 ? (
        <EmptyState text="Nothing scheduled this week." />
      ) : (
        <div>
          {overdue.length > 0 && (
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-xs font-semibold text-yt-red uppercase tracking-wide">Overdue</span>
            </div>
          )}
          {all.map(v => <VideoRow key={v.id} video={v} todayKey={todayKey} onAdvance={onAdvance} />)}
        </div>
      )}
    </div>
  )
}

function ProductionWidget({ videos, todayKey, onAdvance }: {
  videos: Video[]; todayKey: string
  onAdvance: (id: number, stage: Stage) => void
}) {
  return videos.length === 0 ? (
    <EmptyState text="No videos actively in production." />
  ) : (
    <div>
      {videos.map(v => <VideoRow key={v.id} video={v} todayKey={todayKey} onAdvance={onAdvance} />)}
    </div>
  )
}

function XPWidget({ profile }: { profile: UserProfile | null }) {
  if (!profile) return <EmptyState text="Loading…" />
  const xpNeeded = Math.round(100 * Math.pow(profile.current_level + 1, 1.8))
  const pct = Math.min(100, Math.round((profile.current_xp / xpNeeded) * 100))
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-yt-red/15 border-2 border-yt-red/40 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-yt-red">{profile.current_level}</span>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-yt-muted mb-1.5">
            <span className="font-medium text-yt-text">Level {profile.current_level}</span>
            <span>{profile.current_xp} / {xpNeeded} XP</span>
          </div>
          <div className="h-2 bg-yt-elevated rounded-full overflow-hidden">
            <div className="h-full bg-yt-red rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-yt-muted mt-1.5">{xpNeeded - profile.current_xp} XP to level {profile.current_level + 1}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-yt-border">
        <div>
          <div className="text-lg font-bold text-yt-text">{profile.total_xp_earned}</div>
          <div className="text-xs text-yt-muted">Total XP</div>
        </div>
        <div>
          <div className="text-lg font-bold text-yt-text">{pct}%</div>
          <div className="text-xs text-yt-muted">To next level</div>
        </div>
      </div>
    </div>
  )
}

function GoalsWidget({ goals }: { goals: Goal[] }) {
  const GOAL_ICON: Record<string, string> = {
    subscribers: '👥', views: '👁', videos_per_month: '🎬', watch_hours: '⏱', revenue: '💰'
  }
  function fmt(n: number, type: string): string {
    if (type === 'revenue') return `$${n.toLocaleString()}`
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
  }
  if (goals.length === 0) return <EmptyState text="No goals set. Add goals to track your progress." />
  return (
    <div className="space-y-3">
      {goals.slice(0, 4).map(g => {
        const pct = Math.min(100, g.target_value > 0 ? Math.round((g.current_value / g.target_value) * 100) : 0)
        return (
          <div key={g.id}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{GOAL_ICON[g.goal_type] ?? '🎯'}</span>
                <span className="text-sm text-yt-text truncate">{g.title}</span>
              </div>
              <span className="text-xs text-yt-muted flex-shrink-0 ml-2">
                {fmt(g.current_value, g.goal_type)} / {fmt(g.target_value, g.goal_type)}
              </span>
            </div>
            <div className="h-1.5 bg-yt-elevated rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-yt-red'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      {goals.length > 4 && <p className="text-xs text-yt-muted">+{goals.length - 4} more goals</p>}
    </div>
  )
}

function RecentWidget({ videos }: { videos: Video[] }) {
  if (videos.length === 0) return <EmptyState text="No ideas yet. Add your first one!" />
  return (
    <div className="grid grid-cols-3 gap-3">
      {videos.map(v => (
        <div key={v.id} className="bg-yt-elevated rounded-xl p-3 border border-yt-border">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STAGE_DOT[v.stage]}`} />
            <span className={`text-xs capitalize ${STAGE_COLOR[v.stage]}`}>{v.stage}</span>
          </div>
          <p className="text-sm font-medium text-yt-text leading-snug line-clamp-2">{v.title}</p>
          <p className="text-xs text-yt-muted mt-1.5">
            {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export default function Dashboard(): React.ReactElement {
  const { videos, loading, update } = useVideos()
  const [goals,   setGoals]   = useState<Goal[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [customizing, setCustomizing] = useState(false)
  const [enabled, setEnabled] = useState<Record<WidgetId, boolean>>(loadConfig)

  useEffect(() => {
    window.api.goals.getAll().then(setGoals)
    window.api.profile.get().then(setProfile)
    const handler = () => window.api.profile.get().then(setProfile)
    window.addEventListener('gamification:updated', handler)
    return () => window.removeEventListener('gamification:updated', handler)
  }, [])

  const toggle = (id: WidgetId) => {
    setEnabled(prev => {
      const next = { ...prev, [id]: !prev[id] }
      saveConfig(next)
      return next
    })
  }

  const today = new Date()
  const todayKey  = toDateKey(today)
  const weekStart = toDateKey(startOfWeek(today))
  const weekEnd   = toDateKey(endOfWeek(today))

  const { overdue, thisWeek, production, recent, stageCounts } = useMemo(() => {
    const active = videos.filter(v => !v.archived)
    const overdue = active
      .filter(v => v.scheduled_date && v.scheduled_date < todayKey && v.stage !== 'published')
      .sort((a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!))
    const thisWeek = active
      .filter(v => v.scheduled_date && v.scheduled_date >= weekStart && v.scheduled_date <= weekEnd && v.stage !== 'published')
    const production = active
      .filter(v => !v.scheduled_date && v.stage !== 'idea' && v.stage !== 'published')
      .sort((a, b) => STAGE_ORDER.indexOf(b.stage) - STAGE_ORDER.indexOf(a.stage))
    const recent = [...active]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
    const stageCounts = Object.fromEntries(
      STAGE_ORDER.map(s => [s, active.filter(v => v.stage === s).length])
    ) as Record<Stage, number>
    return { overdue, thisWeek, production, recent, stageCounts }
  }, [videos, todayKey, weekStart, weekEnd])

  const advance = (id: number, stage: Stage) => update({ id, stage })

  const weekRange = `${new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(weekEnd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  // Span helpers for paired widgets
  const weekSpan:  1|2 = enabled.week && !enabled.production ? 2 : 1
  const prodSpan:  1|2 = enabled.production && !enabled.week ? 2 : 1
  const xpSpan:    1|2 = enabled.xp && !enabled.goals ? 2 : 1
  const goalsSpan: 1|2 = enabled.goals && !enabled.xp ? 2 : 1
  const pairOneVisible  = enabled.week || enabled.production
  const pairTwoVisible  = enabled.xp   || enabled.goals

  if (loading) return <div className="h-full flex items-center justify-center text-yt-muted">Loading…</div>

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-yt-border flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-yt-text">Dashboard</h1>
          <p className="text-yt-muted text-sm mt-0.5">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setCustomizing(v => !v)}
          className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
            customizing
              ? 'border-yt-red text-yt-red bg-yt-red/10'
              : 'border-yt-border text-yt-muted hover:text-yt-text hover:border-yt-text/30'
          }`}
        >
          {customizing ? 'Done' : '⚙ Customize'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-4">

          {/* Customize panel */}
          {customizing && (
            <div className="bg-yt-elevated border border-yt-border rounded-2xl px-5 py-4">
              <p className="text-xs font-semibold text-yt-muted uppercase tracking-widest mb-3">Visible Widgets</p>
              <div className="flex flex-wrap gap-2">
                {WIDGET_IDS.map(id => (
                  <button
                    key={id}
                    onClick={() => toggle(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      enabled[id]
                        ? 'border-yt-red bg-yt-red/10 text-yt-text'
                        : 'border-yt-border text-yt-muted hover:border-yt-text/30 hover:text-yt-text'
                    }`}
                  >
                    <span className="text-sm leading-none">{WIDGET_META[id].icon}</span>
                    {WIDGET_META[id].label}
                    {enabled[id] && <span className="text-yt-red text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Overdue alert */}
          {overdue.length > 0 && !customizing && (
            <div className="bg-yt-red/10 border border-yt-red/30 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-yt-red font-semibold text-sm flex-shrink-0">⚠ {overdue.length} overdue</span>
              <span className="text-yt-muted text-xs truncate">
                {overdue.map(v => v.title).join(' · ')}
              </span>
            </div>
          )}

          {/* Pipeline Overview — full width */}
          {enabled.pipeline && (
            <div className="grid grid-cols-2 gap-4">
              <WidgetCard id="pipeline" span={2}>
                <PipelineWidget stageCounts={stageCounts} />
              </WidgetCard>
            </div>
          )}

          {/* This Week + In Production */}
          {pairOneVisible && (
            <div className="grid grid-cols-2 gap-4">
              {enabled.week && (
                <WidgetCard id="week" span={weekSpan}>
                  <WeekWidget overdue={overdue} thisWeek={thisWeek} todayKey={todayKey} weekRange={weekRange} onAdvance={advance} />
                </WidgetCard>
              )}
              {enabled.production && (
                <WidgetCard id="production" span={prodSpan}>
                  <ProductionWidget videos={production} todayKey={todayKey} onAdvance={advance} />
                </WidgetCard>
              )}
            </div>
          )}

          {/* XP + Goals */}
          {pairTwoVisible && (
            <div className="grid grid-cols-2 gap-4">
              {enabled.xp && (
                <WidgetCard id="xp" span={xpSpan}>
                  <XPWidget profile={profile} />
                </WidgetCard>
              )}
              {enabled.goals && (
                <WidgetCard id="goals" span={goalsSpan}>
                  <GoalsWidget goals={goals} />
                </WidgetCard>
              )}
            </div>
          )}

          {/* Recent Ideas — full width */}
          {enabled.recent && (
            <div className="grid grid-cols-2 gap-4">
              <WidgetCard id="recent" span={2}>
                <RecentWidget videos={recent} />
              </WidgetCard>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
