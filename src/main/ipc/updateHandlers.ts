import { ipcMain, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

function send(channel: string, payload?: unknown): void {
  BrowserWindow.getAllWindows()[0]?.webContents.send(channel, payload)
}

export function registerUpdateHandlers(): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', info => {
    send('update:available', { version: info.version })
  })

  autoUpdater.on('download-progress', progress => {
    send('update:progress', Math.round(progress.percent))
  })

  autoUpdater.on('update-downloaded', info => {
    send('update:downloaded', { version: info.version })
  })

  autoUpdater.on('error', err => {
    send('update:error', err.message)
  })

  ipcMain.handle('update:install', () => {
    try {
      autoUpdater.quitAndInstall(false, true)
    } catch (err: unknown) {
      send('update:error', err instanceof Error ? err.message : String(err))
    }
  })
}
