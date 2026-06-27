import { ipcMain } from 'electron'
import { getProfile, getLevelHistory, getRewards, getProfileStats } from '../db/steps'

export function registerStepHandlers(): void {
  ipcMain.handle('profile:get',            () => getProfile())
  ipcMain.handle('profile:getLevelHistory', () => getLevelHistory())
  ipcMain.handle('profile:getRewards',      () => getRewards())
  ipcMain.handle('profile:getStats',        () => getProfileStats())
}
