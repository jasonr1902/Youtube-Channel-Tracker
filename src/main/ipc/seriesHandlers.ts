import { ipcMain } from 'electron'
import {
  getAllSeries, getSeries, createSeries, updateSeries,
  deleteSeries, getSeriesVideos, setVideoEpisodeOrder
} from '../db/series'
import type { SeriesCreate, SeriesUpdate } from '../../shared/types'

export function registerSeriesHandlers(): void {
  ipcMain.handle('series:getAll', () => getAllSeries())
  ipcMain.handle('series:get', (_e, id: number) => getSeries(id))
  ipcMain.handle('series:create', (_e, data: SeriesCreate) => createSeries(data))
  ipcMain.handle('series:update', (_e, data: SeriesUpdate) => updateSeries(data))
  ipcMain.handle('series:delete', (_e, id: number) => deleteSeries(id))
  ipcMain.handle('series:getVideos', (_e, seriesId: number) => getSeriesVideos(seriesId))
  ipcMain.handle('series:setEpisodeOrder', (_e, videoId: number, order: number) =>
    setVideoEpisodeOrder(videoId, order)
  )
}
