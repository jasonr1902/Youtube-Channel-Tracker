import React, { useState, useEffect } from 'react'
import { useGoals } from '../hooks/useGoals'
import Modal from '../components/Modal'
import type { Goal, GoalCreate, GoalType, AuthState } from '../../../shared/types'

const GOAL_TYPES: { value: GoalType; label: string; unit: string; icon: string }[] = [
  { value: 'subscribers',     label: 'Subscribers',       unit: 'subs',    icon: '👥' },
  { value: 'views',           label: 'Total Views',        unit: 'views',   icon: '👁' },
  { value: 'videos_per_month',label: 'Videos / Month',    unit: 'videos',  icon: '🎬' },
  { value: 'watch_hours',     label: 'Watch Hours',        unit: 'hrs',     icon: '⏱' },
  { value: 'revenue',         label: 'Monthly Revenue',   unit: '$',       icon: '💰' }
]

function typeInfo(type: GoalType) {
  return GOAL_TYPES.find(t => t.value === type) ?? GOAL_TYPES[0]
}

function fmtNum(n: number, type: GoalType): string {
  if (type === 'revenue') return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function daysUntil(deadline: string): number {
  const d = new Date(deadline + 'T12:00:00')
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

interface GoalFormProps {
  initial?: Partial<Goal>
  onSubmit: (data: GoalCreate) => void
  onCancel: () => void
}

function GoalForm({ initial, onSubmit, onCancel }: GoalFormProps) {
  const [form, setForm] = useState<GoalCreate>({
    title: initial?.title ?? '',
    goal_type: initial?.goal_type ?? 'subscribers',
    target_value: initial?.target_value ?? 0,
    current_value: initial?.current_value ?? 0,
    deadline: initial?.deadline ?? null
  })
  const info = typeInfo(form.goal_type)

  const set = (key: keyof GoalCreate) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm(prev => ({
    ...prev,
    [key]: ['target_value', 'current_value'].includes(key)
      ? Number(e.target.value)
      : e.target.value || (key === 'deadline' ? null : e.target.value)
  }))

  return (
    <form onSubmit={e => { e.preventDefault(); if (form.title.trim()) onSubmit(form) }} className="space-y-4">
      <div>
        <label className="block text-xs text-yt-muted mb-1">Goal Title *</label>
        <input autoFocus value={form.title} onChange={set('title')}
          placeholder="e.g. Hit 10K subscribers"
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red" />
      </div>

      <div>
        <label className="block text-xs text-yt-muted mb-1">Goal Type</label>
        <select value={form.goal_type} onChange={set('goal_type')}
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text focus:outline-none focus:border-yt-red">
          {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-yt-muted mb-1">Current ({info.unit})</label>
          <input type="number" min={0} value={form.current_value} onChange={set('current_value')}
            className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text focus:outline-none focus:border-yt-red" />
        </div>
        <div>
          <label className="block text-xs text-yt-muted mb-1">Target ({info.unit})</label>
          <input type="number" min={1} value={form.target_value} onChange={set('target_value')}
            className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text focus:outline-none focus:border-yt-red" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-yt-muted mb-1">Deadline <span className="text-yt-muted/50">(optional)</span></label>
        <input type="date" value={form.deadline ?? ''} onChange={set('deadline')}
          className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text focus:outline-none focus:border-yt-red" />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-yt-muted hover:text-yt-text">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm bg-yt-red hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
          {initial?.id ? 'Save' : 'Add Goal'}
        </button>
      </div>
    </form>
  )
}

interface GoalCardProps {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
  onUpdateProgress: (current: number) => void
}

function GoalCard({ goal, onEdit, onDelete, onUpdateProgress }: GoalCardProps) {
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressVal, setProgressVal] = useState(goal.current_value.toString())
  const info = typeInfo(goal.goal_type)
  const pct = Math.min(100, goal.target_value > 0 ? Math.round((goal.current_value / goal.target_value) * 100) : 0)
  const done = pct >= 100
  const days = goal.deadline ? daysUntil(goal.deadline) : null

  const statusColor = done
    ? 'text-green-400'
    : days !== null && days < 0
    ? 'text-yt-red'
    : days !== null && days < 14
    ? 'text-yellow-400'
    : 'text-yt-muted'

  const barColor = done ? 'bg-green-500' : pct > 66 ? 'bg-yellow-400' : 'bg-yt-red'

  return (
    <div className="bg-yt-surface border border-yt-border rounded-xl p-4 group">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{info.icon}</span>
          <div>
            <h3 className="font-semibold text-sm text-yt-text">{goal.title}</h3>
            <p className="text-xs text-yt-muted">{info.label}</p>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="text-yt-muted hover:text-yt-text text-xs px-1.5">✎</button>
          <button onClick={onDelete} className="text-yt-muted hover:text-yt-red text-xs px-1.5">✕</button>
        </div>
      </div>

      {/* Progress numbers */}
      <div className="flex items-end justify-between mt-3 mb-2">
        <div>
          {editingProgress ? (
            <form onSubmit={e => { e.preventDefault(); onUpdateProgress(Number(progressVal)); setEditingProgress(false) }}
              className="flex items-center gap-1">
              <input type="number" value={progressVal} onChange={e => setProgressVal(e.target.value)} autoFocus
                className="w-24 bg-yt-elevated border border-yt-red rounded px-2 py-0.5 text-sm text-yt-text focus:outline-none" />
              <button type="submit" className="text-xs text-green-400 hover:text-green-300 px-1">✓</button>
              <button type="button" onClick={() => setEditingProgress(false)} className="text-xs text-yt-muted px-1">✕</button>
            </form>
          ) : (
            <button onClick={() => { setProgressVal(goal.current_value.toString()); setEditingProgress(true) }}
              className="text-left group/num">
              <span className="text-2xl font-bold text-yt-text group-hover/num:text-yt-red transition-colors">
                {fmtNum(goal.current_value, goal.goal_type)}
              </span>
              <span className="text-sm text-yt-muted ml-1">/ {fmtNum(goal.target_value, goal.goal_type)}</span>
            </button>
          )}
        </div>
        <div className={`text-right text-xs ${statusColor}`}>
          {done ? '✓ Achieved!' : days !== null
            ? days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`
            : `${pct}%`}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-yt-elevated rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      {goal.deadline && (
        <p className="text-xs text-yt-muted/60 mt-2">
          Deadline: {new Date(goal.deadline + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}
    </div>
  )
}

const AUTO_SYNC_TYPES: GoalType[] = ['subscribers', 'views', 'watch_hours']

interface Props { triggerNew: number }

export default function GoalsPage({ triggerNew }: Props): React.ReactElement {
  const { goals, loading, create, update, remove } = useGoals()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  useEffect(() => { if (triggerNew > 0) setShowCreate(true) }, [triggerNew])
  useEffect(() => { window.api.auth.getState().then(setAuth) }, [])

  const handleLiveSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const stats = await window.api.youtube.fetchAnalytics(90)
      const ch = stats.channelStats
      const updatable = goals.filter(g => AUTO_SYNC_TYPES.includes(g.goal_type))
      for (const g of updatable) {
        let live: number | null = null
        if (g.goal_type === 'subscribers') live = ch.subscribers
        if (g.goal_type === 'views') live = ch.totalViews
        if (g.goal_type === 'watch_hours')
          live = Math.round(stats.daily.reduce((s, d) => s + d.watchMinutes, 0) / 60)
        if (live !== null) await update({ id: g.id, current_value: live })
      }
      setSyncMsg(`Synced ${updatable.length} goal${updatable.length !== 1 ? 's' : ''} from YouTube.`)
    } catch (e: any) {
      setSyncMsg(`Sync failed: ${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const achieved = goals.filter(g => g.current_value >= g.target_value).length

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-yt-border flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-yt-text">Goals</h1>
          <p className="text-yt-muted text-sm mt-0.5">
            {achieved}/{goals.length} achieved
          </p>
        </div>
        <div className="flex items-center gap-2">
          {auth?.connected && (
            <button onClick={handleLiveSync} disabled={syncing}
              className="flex items-center gap-1.5 border border-yt-border hover:border-yt-red/40 text-yt-muted hover:text-yt-text px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
              {syncing ? '⟳ Syncing…' : '⟳ Sync from YouTube'}
            </button>
          )}
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-yt-red hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <span>+</span> New Goal
          </button>
        </div>
      </div>
      {syncMsg && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-yt-elevated border border-yt-border rounded-xl text-sm text-yt-muted flex-shrink-0">
          {syncMsg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center text-yt-muted py-16">Loading...</div>
        ) : goals.length === 0 ? (
          <div className="text-center text-yt-muted py-16">
            <div className="text-4xl mb-3">🎯</div>
            <p className="text-base font-medium">No goals set</p>
            <p className="text-sm mt-1 text-yt-muted/60">Add subscriber targets, view milestones, and revenue goals.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={() => setEditing(g)}
                onDelete={() => window.confirm('Delete this goal?') && remove(g.id)}
                onUpdateProgress={(current) => update({ id: g.id, current_value: current })}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="New Goal" onClose={() => setShowCreate(false)}>
          <GoalForm onSubmit={async (d) => { await create(d); setShowCreate(false) }} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit Goal" onClose={() => setEditing(null)}>
          <GoalForm
            initial={editing}
            onSubmit={async (d) => { await update({ id: editing.id, ...d }); setEditing(null) }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  )
}
