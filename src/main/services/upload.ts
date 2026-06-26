import { google } from 'googleapis'
import { createReadStream, statSync, existsSync } from 'fs'
import { BrowserWindow } from 'electron'
import { getOAuth2Client } from './auth'
import { getDb } from '../db/database'
import type { QueueItem, QueueItemCreate, StageEvent } from '../../shared/types'

const activeUploads = new Set<number>()

function sendAll(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}

export function getAllQueueItems(): QueueItem[] {
  return getDb().prepare('SELECT * FROM publish_queue ORDER BY created_at DESC').all() as QueueItem[]
}

export function addToQueue(data: QueueItemCreate): QueueItem {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO publish_queue
      (video_id, local_file_path, thumbnail_path, yt_title, yt_description, yt_tags, yt_category, yt_visibility, publish_at)
    VALUES
      (@video_id, @local_file_path, @thumbnail_path, @yt_title, @yt_description, @yt_tags, @yt_category, @yt_visibility, @publish_at)
  `).run({
    video_id: data.video_id,
    local_file_path: data.local_file_path,
    thumbnail_path: data.thumbnail_path ?? null,
    yt_title: data.yt_title,
    yt_description: data.yt_description,
    yt_tags: data.yt_tags,
    yt_category: data.yt_category,
    yt_visibility: data.yt_visibility,
    publish_at: data.publish_at ?? null
  })
  const item = db.prepare('SELECT * FROM publish_queue WHERE id = ?').get(result.lastInsertRowid) as QueueItem

  // Auto-start if publish_at is unset or already past
  const shouldStartNow = !data.publish_at || new Date(data.publish_at).getTime() <= Date.now()
  if (shouldStartNow && activeUploads.size === 0) {
    executeUpload(item.id).catch(console.error)
  }

  return item
}

export function removeQueueItem(id: number): void {
  getDb().prepare('DELETE FROM publish_queue WHERE id = ?').run(id)
}

export async function executeUpload(queueItemId: number): Promise<void> {
  if (activeUploads.has(queueItemId)) return
  activeUploads.add(queueItemId)

  const db = getDb()

  try {
    const item = db.prepare('SELECT * FROM publish_queue WHERE id = ?').get(queueItemId) as QueueItem | undefined
    if (!item) return
    if (item.status === 'live' || item.status === 'scheduled') return

    if (!existsSync(item.local_file_path)) {
      db.prepare("UPDATE publish_queue SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?")
        .run(`File not found: ${item.local_file_path}`, queueItemId)
      sendAll('youtube:queueUpdate', getAllQueueItems())
      return
    }

    db.prepare("UPDATE publish_queue SET status = 'uploading', progress = 0, updated_at = datetime('now') WHERE id = ?")
      .run(queueItemId)
    sendAll('youtube:queueUpdate', getAllQueueItems())

    const auth = getOAuth2Client()
    const youtube = google.youtube({ version: 'v3', auth })
    const fileSize = statSync(item.local_file_path).size
    const tags = item.yt_tags ? item.yt_tags.split(',').map(t => t.trim()).filter(Boolean) : []

    const publishAt = item.publish_at ? new Date(item.publish_at) : null
    const isScheduled = publishAt !== null && publishAt.getTime() > Date.now()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (youtube.videos.insert as any)(
      {
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: item.yt_title,
            description: item.yt_description,
            tags,
            categoryId: item.yt_category || '22'
          },
          status: {
            privacyStatus: isScheduled ? 'private' : item.yt_visibility,
            ...(isScheduled ? { publishAt: publishAt!.toISOString() } : {})
          }
        },
        media: { mimeType: 'video/*', body: createReadStream(item.local_file_path) }
      },
      {
        onUploadProgress: (evt: { bytesRead: number }) => {
          const pct = fileSize > 0 ? Math.min(99, Math.round((evt.bytesRead / fileSize) * 100)) : 0
          db.prepare('UPDATE publish_queue SET progress = ? WHERE id = ?').run(pct, queueItemId)
          sendAll('youtube:uploadProgress', { queueItemId, progress: pct, status: 'uploading' })
        }
      }
    )

    const ytId = res.data.id as string

    // Upload thumbnail if provided and file exists
    if (item.thumbnail_path && existsSync(item.thumbnail_path)) {
      try {
        await youtube.thumbnails.set({
          videoId: ytId,
          media: { body: createReadStream(item.thumbnail_path) }
        })
      } catch (err) {
        console.error('Thumbnail upload failed (non-fatal):', err)
      }
    }

    const finalStatus = isScheduled ? 'scheduled' : 'live'
    const publishDate = isScheduled
      ? publishAt!.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)

    db.prepare("UPDATE publish_queue SET status = ?, youtube_video_id = ?, progress = 100, updated_at = datetime('now') WHERE id = ?")
      .run(finalStatus, ytId, queueItemId)

    db.prepare("UPDATE videos SET youtube_video_id = ?, thumbnail_path = ?, stage = 'published', scheduled_date = ?, updated_at = datetime('now') WHERE id = ?")
      .run(ytId, item.thumbnail_path ?? null, publishDate, item.video_id)

    sendAll('youtube:uploadProgress', { queueItemId, progress: 100, status: finalStatus })
    sendAll('youtube:queueUpdate', getAllQueueItems())

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    db.prepare("UPDATE publish_queue SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?")
      .run(msg, queueItemId)
    sendAll('youtube:queueUpdate', getAllQueueItems())
  } finally {
    activeUploads.delete(queueItemId)
  }
}

let schedulerStarted = false

export function startScheduler(): void {
  if (schedulerStarted) return
  schedulerStarted = true

  setInterval(async () => {
    const db = getDb()
    const pending = db.prepare(`
      SELECT * FROM publish_queue
      WHERE status = 'queued'
        AND (publish_at IS NULL OR datetime(publish_at) <= datetime('now'))
      ORDER BY created_at ASC LIMIT 1
    `).get() as QueueItem | undefined

    if (pending && !activeUploads.has(pending.id)) {
      executeUpload(pending.id).catch(console.error)
    }
  }, 60_000)
}

export function getStageHistory(videoId: number): StageEvent[] {
  return getDb().prepare(
    'SELECT * FROM video_stage_history WHERE video_id = ? ORDER BY changed_at ASC'
  ).all(videoId) as StageEvent[]
}
