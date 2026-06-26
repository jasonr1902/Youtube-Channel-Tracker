import { ipcMain } from 'electron'
import {
  syncChannelVideos,
  fetchVideoStats,
  fetchAnalytics,
  getCachedAnalytics,
  getCachedVideoStats
} from '../services/youtube'
import { getSetting } from '../db/settings'

export function registerYouTubeHandlers(): void {
  ipcMain.handle('youtube:syncVideos', () => syncChannelVideos())

  ipcMain.handle('youtube:fetchVideoStats', (_e, ids: string[]) => fetchVideoStats(ids))

  ipcMain.handle('youtube:fetchAnalytics', (_e, days: number) => fetchAnalytics(days))

  ipcMain.handle('youtube:getCachedAnalytics', (_e, days: number) => getCachedAnalytics(days))

  ipcMain.handle('youtube:getCachedVideoStats', () => getCachedVideoStats())

  ipcMain.handle('youtube:getClientId', () => getSetting('oauth_client_id') ?? '')
}
