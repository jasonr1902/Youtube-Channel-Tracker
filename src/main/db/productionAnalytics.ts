import { getDb } from './database'
import type { StageAvgDays, FunnelCount, VideoTimeStat, ProductionStats } from '../../shared/types'

const STAGE_ORDER = ['idea', 'script', 'filming', 'editing', 'scheduled', 'published']

export function getProductionStats(): ProductionStats {
  const db = getDb()

  // Average days spent in each stage (only completed transitions)
  const rawAvgDays = db.prepare<[], { stage: string; avg_days: number; transitions: number }>(`
    WITH ordered AS (
      SELECT
        video_id, stage, changed_at,
        LEAD(changed_at) OVER (PARTITION BY video_id ORDER BY changed_at) AS next_at
      FROM video_stage_history
    )
    SELECT
      stage,
      ROUND(AVG(julianday(next_at) - julianday(changed_at)), 1) AS avg_days,
      COUNT(*) AS transitions
    FROM ordered
    WHERE next_at IS NOT NULL
    GROUP BY stage
  `).all() as StageAvgDays[]

  // Sort by stage order, fill in missing stages with 0
  const avgDaysMap = new Map(rawAvgDays.map(r => [r.stage, r]))
  const stageAvgDays: StageAvgDays[] = STAGE_ORDER.map(s => avgDaysMap.get(s) ?? { stage: s, avg_days: 0, transitions: 0 })

  // Funnel: how many distinct videos ever reached each stage
  const rawFunnel = db.prepare<[], FunnelCount>(`
    SELECT stage, COUNT(DISTINCT video_id) AS count
    FROM video_stage_history
    GROUP BY stage
  `).all() as FunnelCount[]

  const funnelMap = new Map(rawFunnel.map(r => [r.stage, r.count]))
  const funnelCounts: FunnelCount[] = STAGE_ORDER.map(s => ({ stage: s, count: funnelMap.get(s) ?? 0 }))

  // Totals
  const totalIdeas = (db.prepare(`SELECT COUNT(DISTINCT video_id) AS n FROM video_stage_history`).get() as { n: number })?.n ?? 0
  const publishedCount = (db.prepare(`SELECT COUNT(DISTINCT video_id) AS n FROM video_stage_history WHERE stage = 'published'`).get() as { n: number })?.n ?? 0
  const conversionRate = totalIdeas > 0 ? Math.round((publishedCount / totalIdeas) * 100) : 0

  // Videos ranked by days from first stage entry to published
  const timeToPublish = db.prepare<[], VideoTimeStat>(`
    SELECT
      v.id,
      v.title,
      ROUND(
        julianday(MAX(CASE WHEN h.stage = 'published' THEN h.changed_at END))
        - julianday(MIN(h.changed_at)),
      1) AS days_to_publish
    FROM videos v
    JOIN video_stage_history h ON h.video_id = v.id
    GROUP BY v.id
    HAVING days_to_publish IS NOT NULL
    ORDER BY days_to_publish ASC
  `).all() as VideoTimeStat[]

  const fastestVideos = timeToPublish.slice(0, 5)
  const slowestVideos = timeToPublish.length > 5 ? [...timeToPublish].reverse().slice(0, 5) : [...timeToPublish].reverse()

  // Bottleneck: non-published stage with highest avg days
  const bottleneck = stageAvgDays
    .filter(s => s.stage !== 'published' && s.avg_days > 0)
    .reduce<StageAvgDays | null>((max, s) => (!max || s.avg_days > max.avg_days ? s : max), null)
    ?.stage ?? null

  return { stageAvgDays, funnelCounts, totalIdeas, publishedCount, conversionRate, fastestVideos, slowestVideos, bottleneck }
}
