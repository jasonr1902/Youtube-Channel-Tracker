import { getDb } from './database'
import type { Series, SeriesCreate, SeriesUpdate, Video } from '../../shared/types'

export function getAllSeries(): Series[] {
  return getDb().prepare('SELECT * FROM series ORDER BY name ASC').all() as Series[]
}

export function getSeries(id: number): Series | undefined {
  return getDb().prepare('SELECT * FROM series WHERE id = ?').get(id) as Series | undefined
}

export function createSeries(data: SeriesCreate): Series {
  const result = getDb()
    .prepare('INSERT INTO series (name, description) VALUES (@name, @description)')
    .run(data)
  return getSeries(result.lastInsertRowid as number)!
}

export function updateSeries(data: SeriesUpdate): Series {
  const current = getSeries(data.id)
  if (!current) throw new Error(`Series ${data.id} not found`)
  const merged = { ...current, ...data }
  getDb()
    .prepare('UPDATE series SET name = @name, description = @description WHERE id = @id')
    .run(merged)
  return getSeries(data.id)!
}

export function deleteSeries(id: number): void {
  getDb().prepare('DELETE FROM series WHERE id = ?').run(id)
}

export function getSeriesVideos(seriesId: number): Video[] {
  return getDb()
    .prepare('SELECT * FROM videos WHERE series_id = ? ORDER BY episode_order ASC, created_at ASC')
    .all(seriesId) as Video[]
}

export function setVideoEpisodeOrder(videoId: number, order: number): void {
  getDb()
    .prepare('UPDATE videos SET episode_order = ? WHERE id = ?')
    .run(order, videoId)
}
