import { app, shell, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'
import { getDb } from './db/database'
import { registerVideoHandlers } from './ipc/videoHandlers'
import { registerSeriesHandlers } from './ipc/seriesHandlers'
import { registerGoalHandlers } from './ipc/goalHandlers'
import { registerAuthHandlers } from './ipc/authHandlers'
import { registerYouTubeHandlers } from './ipc/youtubeHandlers'
import { registerUploadHandlers } from './ipc/uploadHandlers'
import { registerUpdateHandlers } from './ipc/updateHandlers'
import { startScheduler } from './services/upload'
import { autoUpdater } from 'electron-updater'

const isDev = process.env.NODE_ENV === 'development'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0F0F0F',
    title: 'YouTube Channel Tracker',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  if (isDev && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(join(__dirname, '../../resources/icon.png')))
  }
  getDb()
  registerVideoHandlers()
  registerSeriesHandlers()
  registerGoalHandlers()
  registerAuthHandlers()
  registerYouTubeHandlers()
  registerUploadHandlers()
  registerUpdateHandlers()
  startScheduler()
  createWindow()

  if (!isDev) {
    autoUpdater.checkForUpdates()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
