import { getDb } from './database'
import { awardXpForNewIdea, awardXpForStageChange } from './steps'
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
    INSERT INTO videos (title, description, tags, thumbnail_concept, priority, stage, series_id, episode_order, scheduled_date, notes, youtube_video_id, thumbnail_path, archived, script_path, script_word_count, script_draft_quality, assets_folder_path)
    VALUES (@title, @description, @tags, @thumbnail_concept, @priority, @stage, @series_id, @episode_order, @scheduled_date, @notes, @youtube_video_id, @thumbnail_path, @archived, @script_path, @script_word_count, @script_draft_quality, @assets_folder_path)
  `).run({ youtube_video_id: null, thumbnail_path: null, archived: 0, script_path: null, script_word_count: null, script_draft_quality: null, assets_folder_path: null, ...data })
  try { awardXpForNewIdea() } catch {}
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
      archived = @archived,
      script_path = @script_path, script_word_count = @script_word_count,
      script_draft_quality = @script_draft_quality, assets_folder_path = @assets_folder_path
    WHERE id = @id
  `).run(merged)

  if (data.stage && data.stage !== current.stage) {
    try { awardXpForStageChange(current.stage, data.stage) } catch {}
  }

  return getVideo(data.id)!
}

export function deleteVideo(id: number): void {
  getDb().prepare('DELETE FROM videos WHERE id = ?').run(id)
}
