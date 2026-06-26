import { ipcMain } from 'electron'
import { getAllVideos, getArchivedVideos, getVideo, createVideo, updateVideo, deleteVideo } from '../db/videos'
import type { VideoCreate, VideoUpdate } from '../../shared/types'

export function registerVideoHandlers(): void {
  ipcMain.handle('videos:getAll', () => getAllVideos())
  ipcMain.handle('videos:getArchived', () => getArchivedVideos())
  ipcMain.handle('videos:get', (_e, id: number) => getVideo(id))
  ipcMain.handle('videos:create', (_e, data: VideoCreate) => createVideo(data))
  ipcMain.handle('videos:update', (_e, data: VideoUpdate) => updateVideo(data))
  ipcMain.handle('videos:delete', (_e, id: number) => deleteVideo(id))
}
