import { useState, useEffect, useCallback } from 'react'
import type { Series, SeriesCreate, SeriesUpdate, Video } from '../../../shared/types'

export function useSeries() {
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const all = await window.api.series.getAll()
    setSeries(all)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async (data: SeriesCreate) => {
    const s = await window.api.series.create(data)
    setSeries(prev => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)))
    return s
  }, [])

  const update = useCallback(async (data: SeriesUpdate) => {
    const updated = await window.api.series.update(data)
    setSeries(prev => prev.map(s => s.id === updated.id ? updated : s))
    return updated
  }, [])

  const remove = useCallback(async (id: number) => {
    await window.api.series.delete(id)
    setSeries(prev => prev.filter(s => s.id !== id))
  }, [])

  const getVideos = useCallback((seriesId: number): Promise<Video[]> =>
    window.api.series.getVideos(seriesId)
  , [])

  const setEpisodeOrder = useCallback(async (videoId: number, order: number) => {
    await window.api.series.setEpisodeOrder(videoId, order)
  }, [])

  return { series, loading, create, update, remove, getVideos, setEpisodeOrder, refresh }
}
