import { ipcMain } from 'electron'
import { getProductionStats } from '../db/productionAnalytics'

export function registerProductionAnalyticsHandlers(): void {
  ipcMain.handle('productionAnalytics:getStats', () => getProductionStats())
}
