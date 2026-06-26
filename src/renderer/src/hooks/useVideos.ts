import { useState, useEffect, useCallback } from 'react'
import type { Video, VideoCreate, VideoUpdate } from '../../../shared/types'

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const all = await window.api.videos.getAll()
    setVideos(all)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async (data: VideoCreate) => {
    const video = await window.api.videos.create(data)
    setVideos(prev => [video, ...prev])
    return video
  }, [])

  const update = useCallback(async (data: VideoUpdate) => {
    const updated = await window.api.videos.update(data)
    if (updated.archived) {
      setVideos(prev => prev.filter(v => v.id !== updated.id))
    } else {
      setVideos(prev => prev.map(v => v.id === updated.id ? updated : v))
    }
    return updated
  }, [])

  const archive = useCallback(async (id: number) => {
    await window.api.videos.update({ id, archived: 1 })
    setVideos(prev => prev.filter(v => v.id !== id))
  }, [])

  const remove = useCallback(async (id: number) => {
    await window.api.videos.delete(id)
    setVideos(prev => prev.filter(v => v.id !== id))
  }, [])

  return { videos, loading, create, update, archive, remove, refresh }
}
