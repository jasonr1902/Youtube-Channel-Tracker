import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import type { UserProfile, LevelHistoryEntry, Reward, Account } from '../../../shared/types'

function xpToNextLevel(level: number): number {
  return Math.round(100 * Math.pow(level + 1, 1.8))
}

function AccountsCard(): React.ReactElement {
  const [accounts, setAccounts]     = useState<Account[]>([])
  const [activeId, setActiveId]     = useState('')
  const [adding, setAdding]         = useState(false)
  const [newName, setNewName]       = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal]   = useState('')
  const addRef    = useRef<HTMLInputElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [all, id] = await Promise.all([window.api.accounts.getAll(), window.api.accounts.getActive()])
    setAccounts(all)
    setActiveId(id)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (adding)    addRef.current?.focus()    }, [adding])
  useEffect(() => { if (renamingId) renameRef.current?.select() }, [renamingId])

  const handleSwitch = async (id: string) => {
    if (id === activeId) return
    await window.api.accounts.switch(id)
  }

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) { setAdding(false); return }
    const account = await window.api.accounts.create(name)
    setNewName('')
    setAdding(false)
    await window.api.accounts.switch(account.id)
  }

  const handleRename = async (id: string) => {
    const name = renameVal.trim()
    if (name) {
      const updated = await window.api.accounts.rename(id, name)
      setAccounts(updated)
    }
    setRenamingId(null)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?\n\nAll data for this account will be permanently deleted.`)) return
    const updated = await window.api.accounts.delete(id)
    setAccounts(updated)
    if (id === activeId) await window.api.accounts.switch(updated[0].id)
  }

  return (
    <div className="bg-yt-elevated rounded-2xl border border-yt-border overflow-hidden">
      <div className="px-5 py-3 border-b border-yt-border">
        <h3 className="text-sm font-semibold text-yt-text uppercase tracking-wide">Accounts</h3>
      </div>

      <div className="divide-y divide-yt-border">
        {accounts.map(account => (
          <div key={account.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-yt-surface/50 transition-colors">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${account.id === activeId ? 'bg-yt-red' : 'bg-yt-border'}`} />

            {renamingId === account.id ? (
              <input
                ref={renameRef}
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={() => handleRename(account.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename(account.id)
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                className="flex-1 bg-transparent text-sm text-yt-text border-b border-yt-red focus:outline-none"
              />
            ) : (
              <span
                className={`flex-1 text-sm ${account.id === activeId ? 'text-yt-text font-medium' : 'text-yt-muted'}`}
              >
                {account.name}
                {account.id === activeId && <span className="ml-2 text-xs text-yt-muted font-normal">active</span>}
              </span>
            )}

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {account.id !== activeId && (
                <button
                  onClick={() => handleSwitch(account.id)}
                  className="text-xs text-yt-muted hover:text-yt-red border border-yt-border hover:border-yt-red/40 rounded px-2 py-0.5 transition-colors"
                >
                  Switch
                </button>
              )}
              {renamingId !== account.id && (
                <button
                  onClick={() => { setRenamingId(account.id); setRenameVal(account.name) }}
                  className="text-xs text-yt-muted hover:text-yt-text px-1"
                  title="Rename"
                >✎</button>
              )}
              {accounts.length > 1 && (
                <button
                  onClick={() => handleDelete(account.id, account.name)}
                  className="text-xs text-yt-muted hover:text-red-400 px-1"
                  title="Delete"
                >✕</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-t border-yt-border">
        {adding ? (
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-yt-border flex-shrink-0" />
            <input
              ref={addRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setAdding(false); setNewName('') }
              }}
              onBlur={() => { if (!newName.trim()) setAdding(false) }}
              placeholder="Account name…"
              className="flex-1 bg-transparent text-sm text-yt-text border-b border-yt-red focus:outline-none placeholder-yt-muted/50"
            />
            <button
              onClick={handleAdd}
              className="text-xs text-yt-red hover:text-red-400 transition-colors"
            >Add</button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 text-sm text-yt-muted hover:text-yt-text transition-colors"
          >
            <span className="text-base leading-none">+</span> Add account
          </button>
        )}
      </div>
    </div>
  )
}

const BADGE_EMOJI: Record<string, string> = {
  first_step: '🥇',
  getting_started: '🚀',
  rising_creator: '⭐',
  dedicated: '💪',
  machine: '🤖',
  legend: '👑'
}

function BadgeCard({ reward }: { reward: Reward }) {
  const unlocked = !!reward.unlocked_at
  return (
    <div className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${
      unlocked ? 'border-yt-red/40 bg-yt-elevated' : 'border-yt-border bg-yt-elevated/30 opacity-50'
    }`}>
      <span className="text-3xl">{BADGE_EMOJI[reward.reward_key] ?? '🏅'}</span>
      <span className="text-xs font-medium text-yt-text text-center">{reward.label}</span>
      <span className="text-xs text-yt-muted">Lv.{reward.unlocked_at_level}</span>
      {unlocked && reward.unlocked_at && (
        <span className="text-xs text-yt-muted/60">
          {new Date(reward.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      )}
      {!unlocked && (
        <span className="text-xs text-yt-muted/40">Locked</span>
      )}
    </div>
  )
}

export default function ProfilePage(): React.ReactElement {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [history, setHistory] = useState<LevelHistoryEntry[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [stats, setStats] = useState<{ ideasAdded: number } | null>(null)

  const load = useCallback(async () => {
    const [prof, hist, rwds, st] = await Promise.all([
      window.api.profile.get(),
      window.api.profile.getLevelHistory(),
      window.api.profile.getRewards(),
      window.api.profile.getStats()
    ])
    setProfile(prof)
    setHistory(hist)
    setRewards(rwds)
    setStats(st)
  }, [])

  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener('gamification:updated', handler)
    return () => window.removeEventListener('gamification:updated', handler)
  }, [load])

  if (!profile) return <div className="flex-1 flex items-center justify-center text-yt-muted">Loading…</div>

  const xpNeeded = xpToNextLevel(profile.current_level)
  const xpPct = Math.min(100, Math.round((profile.current_xp / xpNeeded) * 100))

  const chartData = history.map(e => ({
    level: e.level,
    date: new Date(e.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    xp: e.xp_at_achievement
  }))

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        {/* Accounts */}
        <AccountsCard />

        {/* Level header */}
        <div className="bg-yt-elevated rounded-2xl p-6 border border-yt-border">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-yt-red/20 border-2 border-yt-red flex items-center justify-center">
              <span className="text-2xl font-bold text-yt-red">{profile.current_level}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-yt-text">Level {profile.current_level}</h2>
              <p className="text-sm text-yt-muted">{profile.total_xp_earned} total XP earned</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-yt-muted">
              <span>{profile.current_xp} XP</span>
              <span>{xpNeeded} XP needed</span>
            </div>
            <div className="h-3 bg-yt-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-yt-red rounded-full transition-all duration-700"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <p className="text-xs text-yt-muted text-right">{xpNeeded - profile.current_xp} XP to level {profile.current_level + 1}</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-yt-elevated rounded-xl p-4 border border-yt-border text-center">
              <p className="text-3xl font-bold text-yt-text">{stats.ideasAdded}</p>
              <p className="text-xs text-yt-muted mt-1">Ideas in vault</p>
              <p className="text-xs text-yt-muted/40 mt-0.5">50 XP each</p>
            </div>
            <div className="bg-yt-elevated rounded-xl p-4 border border-yt-border text-center">
              <p className="text-3xl font-bold text-yt-text">{profile.total_xp_earned}</p>
              <p className="text-xs text-yt-muted mt-1">Total XP earned</p>
              <p className="text-xs text-yt-muted/40 mt-0.5">All time</p>
            </div>
          </div>
        )}

        {/* Badges */}
        <div>
          <h3 className="text-sm font-semibold text-yt-text mb-3 uppercase tracking-wide">Badges</h3>
          <div className="grid grid-cols-3 gap-3">
            {rewards.map(r => <BadgeCard key={r.id} reward={r} />)}
          </div>
        </div>

        {/* Level timeline */}
        {history.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-yt-text mb-3 uppercase tracking-wide">Level Timeline</h3>
            <div className="bg-yt-elevated rounded-xl p-4 border border-yt-border">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} />
                  <YAxis dataKey="level" tick={{ fill: '#888', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                    labelStyle={{ color: '#aaa', fontSize: 11 }}
                    itemStyle={{ color: '#ff0000', fontSize: 12 }}
                    formatter={(v: number) => [`Level ${v}`, '']}
                  />
                  <Line
                    type="monotone"
                    dataKey="level"
                    stroke="#ff0000"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#ff0000', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {history.length === 0 && (
          <div className="text-center py-8 text-yt-muted">
            <div className="text-4xl mb-3">🎮</div>
            <p className="text-sm">Earn XP by creating ideas, advancing stages, and growing your channel!</p>
            <div className="text-xs text-yt-muted/60 mt-2 space-y-0.5">
              <p>💡 New idea added — 50 XP</p>
              <p>📈 Stage advance — 100 XP per step forward</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
