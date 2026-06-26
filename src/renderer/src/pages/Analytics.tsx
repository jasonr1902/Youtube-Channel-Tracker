import React, { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import type { AuthState, DailyMetric, VideoStats, ChannelStats } from '../../../shared/types'

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-yt-surface border border-yt-border rounded-xl p-4">
      <p className="text-xs text-yt-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-yt-text">{value}</p>
      {sub && <p className="text-xs text-yt-muted mt-0.5">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-xs">
      <p className="text-yt-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmtK(p.value)}</p>
      ))}
    </div>
  )
}

export default function AnalyticsPage(): React.ReactElement {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [daily, setDaily] = useState<DailyMetric[]>([])
  const [channelStats, setChannelStats] = useState<ChannelStats | null>(null)
  const [topVideos, setTopVideos] = useState<VideoStats[]>([])
  const [staleMinutes, setStaleMinutes] = useState<number>(Infinity)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  const loadCached = useCallback(async (d: number) => {
    const [cached, videos] = await Promise.all([
      window.api.youtube.getCachedAnalytics(d),
      window.api.youtube.getCachedVideoStats()
    ])
    setDaily(cached.daily)
    setStaleMinutes(cached.staleMinutes)
    setTopVideos(videos)
  }, [])

  useEffect(() => {
    window.api.auth.getState().then(setAuth)
    loadCached(days)
  }, [loadCached, days])

  const handleExport = async () => {
    setExporting(true)
    setExportMsg(null)
    try {
      const result = await window.api.export.channelReport()
      if (result.saved) setExportMsg(`Saved to ${result.path}`)
      else setExportMsg(null)
    } catch (e: unknown) {
      setExportMsg(`Export failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setExporting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const result = await window.api.youtube.fetchAnalytics(days)
      setDaily(result.daily)
      setChannelStats(result.channelStats)
      setStaleMinutes(0)

      // Fetch video stats for published videos
      const vids = await window.api.videos.getAll()
      const ids = vids.filter(v => v.youtube_video_id).map(v => v.youtube_video_id!)
      if (ids.length) {
        const stats = await window.api.youtube.fetchVideoStats(ids)
        setTopVideos(stats)
      }
    } catch (e: any) {
      setSyncError(e.message ?? 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const totalViews = daily.reduce((s, d) => s + d.views, 0)
  const totalSubs = daily.reduce((s, d) => s + d.subscribersGained, 0)
  const totalWatchHrs = Math.round(daily.reduce((s, d) => s + d.watchMinutes, 0) / 60)

  const chartData = daily.map(d => ({
    date: d.date.slice(5),
    Views: d.views,
    Subscribers: d.subscribersGained
  }))

  if (!auth?.connected) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-base font-semibold text-yt-text mb-1">No YouTube account connected</p>
          <p className="text-sm text-yt-muted mb-4">Connect your channel in Settings to view analytics.</p>
          <p className="text-xs text-yt-muted/60">Settings → Connect YouTube Account</p>
        </div>
      </div>
    )
  }

  const staleLabel = staleMinutes === Infinity
    ? 'Never synced'
    : staleMinutes < 60
    ? `${staleMinutes}m ago`
    : `${Math.floor(staleMinutes / 60)}h ago`

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-yt-border flex items-center gap-4 flex-shrink-0">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-yt-text">Analytics</h1>
          <p className="text-yt-muted text-sm mt-0.5">
            {auth.channelName} · Last synced: {staleLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text focus:outline-none">
            <option value={7}>7 days</option>
            <option value={28}>28 days</option>
            <option value={90}>90 days</option>
          </select>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 border border-yt-border hover:border-yt-red/40 text-yt-muted hover:text-yt-text px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
            {exporting ? 'Exporting…' : '↓ Export CSV'}
          </button>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 bg-yt-red hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {syncing ? '⟳ Syncing…' : '⟳ Sync Now'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {exportMsg && (
          <div className="px-4 py-3 bg-yt-elevated border border-yt-border rounded-xl text-sm text-yt-muted">
            {exportMsg}
          </div>
        )}
        {syncError && (
          <div className="px-4 py-3 bg-red-900/30 border border-red-700/40 rounded-xl text-sm text-red-300">
            {syncError}
          </div>
        )}

        {/* Channel-level stats */}
        {channelStats && (
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Subscribers" value={fmtK(channelStats.subscribers)} />
            <StatCard label="Total Views" value={fmtK(channelStats.totalViews)} />
            <StatCard label="Videos Published" value={String(channelStats.videoCount)} />
          </div>
        )}

        {/* Period stats */}
        {daily.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <StatCard label={`Views (${days}d)`} value={fmtK(totalViews)} />
            <StatCard label={`New Subs (${days}d)`} value={`+${fmtK(totalSubs)}`} />
            <StatCard label={`Watch Hours (${days}d)`} value={fmtK(totalWatchHrs)} sub="hours" />
          </div>
        )}

        {/* Views chart */}
        {chartData.length > 0 ? (
          <div className="bg-yt-surface border border-yt-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-yt-text mb-4">Views over time</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF0000" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF0000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3D3D3D" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#AAAAAA', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#AAAAAA', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={fmtK} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Views" stroke="#FF0000" strokeWidth={2} fill="url(#viewsGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-yt-surface border border-yt-border rounded-xl p-8 text-center">
            <p className="text-yt-muted text-sm">No data cached yet — click <strong>Sync Now</strong> to load analytics from YouTube.</p>
          </div>
        )}

        {/* Subscriber chart */}
        {chartData.length > 0 && (
          <div className="bg-yt-surface border border-yt-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-yt-text mb-4">New subscribers per day</h2>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="subsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3D3D3D" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#AAAAAA', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#AAAAAA', fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Subscribers" stroke="#4ade80" strokeWidth={2} fill="url(#subsGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top videos */}
        {topVideos.length > 0 && (
          <div className="bg-yt-surface border border-yt-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-yt-text mb-4">Top Videos</h2>
            <div className="space-y-3">
              {topVideos.slice(0, 10).map((v, i) => (
                <div key={v.youtube_video_id} className="flex items-center gap-3">
                  <span className="text-xs text-yt-muted w-5 text-right flex-shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-yt-text truncate">{v.title}</p>
                    <p className="text-xs text-yt-muted">{fmtK(v.views)} views · {fmtK(v.likes)} likes</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-yt-text">{fmtK(v.views)}</div>
                    <div className="text-xs text-yt-muted">views</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
