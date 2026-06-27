import { google } from 'googleapis'
import { getOAuth2Client } from './auth'
import { getDb } from '../db/database'
import { getSetting, setSetting } from '../db/settings'
import type { ChannelStats, VideoStats, DailyMetric, SyncResult } from '../../shared/types'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function fetchChannelStats(): Promise<ChannelStats> {
  const auth = getOAuth2Client()
  const youtube = google.youtube({ version: 'v3', auth })

  const res = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true
  })
  const ch = res.data.items?.[0]
  if (!ch) throw new Error('No channel found')

  const stats = ch.statistics!
  return {
    channelId: ch.id ?? '',
    channelName: ch.snippet?.title ?? '',
    channelThumb: ch.snippet?.thumbnails?.default?.url ?? '',
    subscribers: Number(stats.subscriberCount ?? 0),
    totalViews: Number(stats.viewCount ?? 0),
    videoCount: Number(stats.videoCount ?? 0)
  }
}

export async function syncChannelVideos(): Promise<SyncResult> {
  const auth = getOAuth2Client()
  const youtube = google.youtube({ version: 'v3', auth })

  // Get uploads playlist ID
  const chRes = await youtube.channels.list({ part: ['contentDetails'], mine: true })
  const uploadsId = chRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) throw new Error('Could not find uploads playlist')

  // Paginate through uploads (max 50 per page, up to 200)
  const videoIds: string[] = []
  const videoMeta: Record<string, { title: string; publishedAt: string; thumbnail: string; description: string }> = {}
  let pageToken: string | undefined

  for (let page = 0; page < 4; page++) {
    const res = await youtube.playlistItems.list({
      part: ['snippet', 'contentDetails'],
      playlistId: uploadsId,
      maxResults: 50,
      pageToken
    })
    for (const item of res.data.items ?? []) {
      const vid = item.contentDetails?.videoId
      if (!vid) continue
      videoIds.push(vid)
      videoMeta[vid] = {
        title: item.snippet?.title ?? '',
        publishedAt: item.snippet?.publishedAt ?? '',
        thumbnail: item.snippet?.thumbnails?.medium?.url ?? '',
        description: item.snippet?.description ?? ''
      }
    }
    if (!res.data.nextPageToken) break
    pageToken = res.data.nextPageToken
  }

  const db = getDb()
  let created = 0, matched = 0

  for (const ytId of videoIds) {
    const meta = videoMeta[ytId]
    const existing = db.prepare('SELECT id FROM videos WHERE youtube_video_id = ?').get(ytId) as { id: number } | undefined

    if (existing) {
      matched++
    } else {
      // Check by title match as fallback
      const byTitle = db.prepare('SELECT id FROM videos WHERE title = ? AND youtube_video_id IS NULL').get(meta.title) as { id: number } | undefined
      if (byTitle) {
        db.prepare('UPDATE videos SET youtube_video_id = ? WHERE id = ?').run(ytId, byTitle.id)
        matched++
      } else {
        // Create new card in Published stage
        db.prepare(`
          INSERT INTO videos (title, description, stage, youtube_video_id, scheduled_date, archived)
          VALUES (?, ?, 'published', ?, ?, 1)
        `).run(
          meta.title,
          meta.description.slice(0, 500),
          ytId,
          meta.publishedAt ? meta.publishedAt.slice(0, 10) : null
        )
        created++
      }
    }
  }

  setSetting('last_sync_at', new Date().toISOString())
  return { created, matched, total: videoIds.length }
}

export async function fetchVideoStats(youtubeVideoIds: string[]): Promise<VideoStats[]> {
  if (youtubeVideoIds.length === 0) return []
  const auth = getOAuth2Client()
  const youtube = google.youtube({ version: 'v3', auth })

  // Batch in chunks of 50
  const results: VideoStats[] = []
  for (let i = 0; i < youtubeVideoIds.length; i += 50) {
    const chunk = youtubeVideoIds.slice(i, i + 50)
    const res = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: chunk
    })
    for (const v of res.data.items ?? []) {
      const s = v.statistics!
      results.push({
        youtube_video_id: v.id ?? '',
        title: v.snippet?.title ?? '',
        publishedAt: v.snippet?.publishedAt ?? '',
        thumbnail: v.snippet?.thumbnails?.medium?.url ?? '',
        views: Number(s.viewCount ?? 0),
        likes: Number(s.likeCount ?? 0),
        comments: Number(s.commentCount ?? 0),
        watchMinutes: 0,
        ctr: null,
        avgViewPct: null
      })
    }
  }

  // Cache in DB
  const db = getDb()
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO youtube_video_stats (youtube_video_id, views, likes, comments, fetched_at)
    VALUES (@youtube_video_id, @views, @likes, @comments, datetime('now'))
  `)
  for (const r of results) upsert.run(r)

  return results
}

export async function fetchAnalytics(days = 30): Promise<{ daily: DailyMetric[]; channelStats: ChannelStats }> {
  const auth = getOAuth2Client()
  const endDate = isoDate(new Date())
  const startDate = isoDate(new Date(Date.now() - days * 86400000))

  const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth })

  const [analyticsRes, channelStats] = await Promise.all([
    youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,subscribersGained',
      dimensions: 'day',
      sort: 'day'
    }),
    fetchChannelStats()
  ])

  const db = getDb()
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO channel_daily (date, views, subscribers_gained, watch_minutes)
    VALUES (?, ?, ?, ?)
  `)

  const daily: DailyMetric[] = []
  for (const row of analyticsRes.data.rows ?? []) {
    const [date, views, watchMins, subs] = row as [string, number, number, number]
    daily.push({ date, views, subscribersGained: subs, watchMinutes: watchMins })
    upsert.run(date, views, subs, watchMins)
  }

  setSetting('last_sync_at', new Date().toISOString())
  return { daily, channelStats }
}

export function getCachedAnalytics(days = 30): { daily: DailyMetric[]; staleMinutes: number } {
  const db = getDb()
  const since = isoDate(new Date(Date.now() - days * 86400000))
  const rows = db.prepare('SELECT * FROM channel_daily WHERE date >= ? ORDER BY date ASC').all(since) as {
    date: string; views: number; subscribers_gained: number; watch_minutes: number
  }[]

  const lastSync = getSetting('last_sync_at')
  const staleMinutes = lastSync
    ? Math.floor((Date.now() - new Date(lastSync).getTime()) / 60000)
    : Infinity

  return {
    daily: rows.map(r => ({ date: r.date, views: r.views, subscribersGained: r.subscribers_gained, watchMinutes: r.watch_minutes })),
    staleMinutes
  }
}

export function getCachedVideoStats(): VideoStats[] {
  const db = getDb()
  return (db.prepare(`
    SELECT s.*, v.title, v.scheduled_date as publishedAt, '' as thumbnail
    FROM youtube_video_stats s
    LEFT JOIN videos v ON v.youtube_video_id = s.youtube_video_id
    ORDER BY s.views DESC
    LIMIT 20
  `).all() as any[]).map(r => ({
    youtube_video_id: r.youtube_video_id,
    title: r.title ?? r.youtube_video_id,
    publishedAt: r.publishedAt ?? '',
    thumbnail: '',
    views: r.views,
    likes: r.likes,
    comments: r.comments,
    watchMinutes: r.watch_minutes,
    ctr: r.ctr,
    avgViewPct: r.avg_view_pct
  }))
}
