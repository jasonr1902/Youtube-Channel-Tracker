import { getDb } from './database'
import type { Video, VideoCreate, VideoUpdate } from '../../shared/types'

export function getAllVideos(): Video[] {
  return getDb().prepare('SELECT * FROM videos WHERE archived = 0 ORDER BY updated_at DESC').all() as Video[]
}

export function getArchivedVideos(): Video[] {
  return getDb().prepare('SELECT * FROM videos WHERE archived = 1 ORDER BY updated_at DESC').all() as Video[]
}

export function getVideo(id: number): Video | undefined {
  return getDb().prepare('SELECT * FROM videos WHERE id = ?').get(id) as Video | undefined
}

export function createVideo(data: VideoCreate): Video {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO videos (title, description, tags, thumbnail_concept, priority, stage, series_id, episode_order, scheduled_date, notes, youtube_video_id, thumbnail_path, archived)
    VALUES (@title, @description, @tags, @thumbnail_concept, @priority, @stage, @series_id, @episode_order, @scheduled_date, @notes, @youtube_video_id, @thumbnail_path, @archived)
  `).run({ youtube_video_id: null, thumbnail_path: null, archived: 0, ...data })
  return getVideo(result.lastInsertRowid as number)!
}

export function updateVideo(data: VideoUpdate): Video {
  const db = getDb()
  const current = getVideo(data.id)
  if (!current) throw new Error(`Video ${data.id} not found`)

  const merged = { ...current, ...data }
  db.prepare(`
    UPDATE videos SET
      title = @title, description = @description, tags = @tags,
      thumbnail_concept = @thumbnail_concept, priority = @priority,
      stage = @stage, series_id = @series_id, episode_order = @episode_order,
      scheduled_date = @scheduled_date, notes = @notes,
      youtube_video_id = @youtube_video_id, thumbnail_path = @thumbnail_path,
      archived = @archived
    WHERE id = @id
  `).run(merged)
  return getVideo(data.id)!
}

export function deleteVideo(id: number): void {
  getDb().prepare('DELETE FROM videos WHERE id = ?').run(id)
}
