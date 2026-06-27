import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  CartesianGrid
} from 'recharts'
import type { ProductionStats } from '../../../shared/types'

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idea',
  script: 'Script',
  filming: 'Filming',
  editing: 'Editing',
  scheduled: 'Scheduled',
  published: 'Published'
}

const STAGE_COLORS: Record<string, string> = {
  idea: '#60a5fa',
  script: '#a78bfa',
  filming: '#fbbf24',
  editing: '#fb923c',
  scheduled: '#34d399',
  published: '#ff0000'
}

function fmtDays(d: number): string {
  if (d < 1) return `${Math.round(d * 24)}h`
  return `${d}d`
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${accent ? 'bg-yt-red/10 border-yt-red/30' : 'bg-yt-elevated border-yt-border'}`}>
      <p className="text-xs text-yt-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-yt-red' : 'text-yt-text'}`}>{value}</p>
      {sub && <p className="text-xs text-yt-muted mt-0.5">{sub}</p>}
    </div>
  )
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-xs">
      <p className="text-yt-muted mb-1">{STAGE_LABELS[label] ?? label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name === 'avg_days' ? `Avg time: ${fmtDays(p.value)}` : `${p.value} videos`}
        </p>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-xs">
        <div className="text-5xl mb-4">🎬</div>
        <p className="text-base font-semibold text-yt-text mb-1">No production data yet</p>
        <p className="text-sm text-yt-muted">Add ideas and move them through stages to see your production pipeline analytics.</p>
      </div>
    </div>
  )
}

export default function ProductionAnalyticsPage(): React.ReactElement {
  const [stats, setStats] = useState<ProductionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.productionAnalytics.getStats().then(s => {
      setStats(s)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex-1 flex items-center justify-center text-yt-muted">Loading…</div>
  if (!stats || stats.totalIdeas === 0) return (
    <div className="h-full flex flex-col">
      <Header />
      <EmptyState />
    </div>
  )

  const avgPublishDays = stats.fastestVideos.length > 0
    ? Math.round(
        [...stats.fastestVideos, ...stats.slowestVideos]
          .reduce((sum, v, _, arr) => sum + v.days_to_publish / arr.length, 0)
      )
    : null

  const bottleneckLabel = stats.bottleneck ? STAGE_LABELS[stats.bottleneck] : null
  const bottleneckDays = stats.bottleneck
    ? stats.stageAvgDays.find(s => s.stage === stats.bottleneck)?.avg_days
    : null

  // Funnel chart — only stages with data
  const funnelData = stats.funnelCounts.filter(f => f.count > 0)

  // Stage timing — exclude stages with no data and 'published' (exit point, not a wait)
  const timingData = stats.stageAvgDays.filter(s => s.stage !== 'published' && s.avg_days > 0)

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Key metrics */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Ideas" value={String(stats.totalIdeas)} />
          <StatCard label="Published" value={String(stats.publishedCount)} />
          <StatCard
            label="Conversion Rate"
            value={`${stats.conversionRate}%`}
            sub="idea → published"
            accent={stats.conversionRate >= 50}
          />
          {bottleneckLabel ? (
            <StatCard
              label="Biggest Bottleneck"
              value={bottleneckLabel}
              sub={bottleneckDays ? `avg ${fmtDays(bottleneckDays)} in this stage` : undefined}
            />
          ) : (
            <StatCard label="Avg to Publish" value={avgPublishDays != null ? `${avgPublishDays}d` : '—'} sub="idea → published" />
          )}
        </div>

        {/* Funnel */}
        {funnelData.length > 0 && (
          <div className="bg-yt-elevated border border-yt-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-yt-text mb-1">Stage Funnel</h2>
            <p className="text-xs text-yt-muted mb-4">How many videos have ever reached each stage</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis
                  dataKey="stage"
                  tick={{ fill: '#aaa', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={s => STAGE_LABELS[s] ?? s}
                />
                <YAxis tick={{ fill: '#aaa', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {funnelData.map(entry => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? '#888'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Avg time per stage */}
        {timingData.length > 0 && (
          <div className="bg-yt-elevated border border-yt-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-yt-text mb-1">Average Time Per Stage</h2>
            <p className="text-xs text-yt-muted mb-4">Days a video typically spends at each stage before moving forward</p>
            <ResponsiveContainer width="100%" height={timingData.length * 48 + 16}>
              <BarChart
                data={timingData}
                layout="vertical"
                margin={{ top: 0, right: 60, bottom: 0, left: 64 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#aaa', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}d`}
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tick={{ fill: '#aaa', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={s => STAGE_LABELS[s] ?? s}
                  width={60}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="avg_days" radius={[0, 4, 4, 0]}>
                  {timingData.map(entry => (
                    <Cell
                      key={entry.stage}
                      fill={entry.stage === stats.bottleneck ? '#ff0000' : STAGE_COLORS[entry.stage] ?? '#888'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {stats.bottleneck && (
              <p className="text-xs text-yt-red mt-3">
                ⚠ <strong>{STAGE_LABELS[stats.bottleneck]}</strong> is your bottleneck — videos spend the most time here.
              </p>
            )}
          </div>
        )}

        {/* Fastest / Slowest */}
        {stats.fastestVideos.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <VideoTimeTable title="Fastest to Publish" icon="⚡" videos={stats.fastestVideos} />
            <VideoTimeTable title="Slowest to Publish" icon="🐢" videos={stats.slowestVideos} />
          </div>
        )}

      </div>
    </div>
  )
}

function Header() {
  return (
    <div className="px-6 pt-6 pb-4 border-b border-yt-border flex-shrink-0">
      <h1 className="text-2xl font-bold text-yt-text">Production Analytics</h1>
      <p className="text-yt-muted text-sm mt-0.5">Pipeline performance — stage timing, funnel, bottlenecks</p>
    </div>
  )
}

function VideoTimeTable({ title, icon, videos }: { title: string; icon: string; videos: { id: number; title: string; days_to_publish: number }[] }) {
  return (
    <div className="bg-yt-elevated border border-yt-border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-yt-text mb-3">{icon} {title}</h2>
      <div className="space-y-2">
        {videos.map((v, i) => (
          <div key={v.id} className="flex items-center gap-3">
            <span className="text-xs text-yt-muted w-4 text-right flex-shrink-0">#{i + 1}</span>
            <p className="flex-1 text-sm text-yt-text truncate min-w-0">{v.title}</p>
            <span className="text-xs font-medium text-yt-muted flex-shrink-0">{fmtDays(v.days_to_publish)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
