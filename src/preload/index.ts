import { contextBridge, ipcRenderer } from 'electron'
import type {
  VideoCreate, VideoUpdate,
  SeriesCreate, SeriesUpdate,
  GoalCreate, GoalUpdate,
  QueueItemCreate, QueueItem, StageEvent, UploadProgressEvent
} from '../shared/types'

const api = {
  videos: {
    getAll: () => ipcRenderer.invoke('videos:getAll'),
    getArchived: () => ipcRenderer.invoke('videos:getArchived'),
    get: (id: number) => ipcRenderer.invoke('videos:get', id),
    create: (data: VideoCreate) => ipcRenderer.invoke('videos:create', data),
    update: (data: VideoUpdate) => ipcRenderer.invoke('videos:update', data),
    delete: (id: number) => ipcRenderer.invoke('videos:delete', id),
    getStageHistory: (id: number) => ipcRenderer.invoke('videos:getStageHistory', id)
  },
  series: {
    getAll: () => ipcRenderer.invoke('series:getAll'),
    get: (id: number) => ipcRenderer.invoke('series:get', id),
    create: (data: SeriesCreate) => ipcRenderer.invoke('series:create', data),
    update: (data: SeriesUpdate) => ipcRenderer.invoke('series:update', data),
    delete: (id: number) => ipcRenderer.invoke('series:delete', id),
    getVideos: (seriesId: number) => ipcRenderer.invoke('series:getVideos', seriesId),
    setEpisodeOrder: (videoId: number, order: number) => ipcRenderer.invoke('series:setEpisodeOrder', videoId, order)
  },
  goals: {
    getAll: () => ipcRenderer.invoke('goals:getAll'),
    create: (data: GoalCreate) => ipcRenderer.invoke('goals:create', data),
    update: (data: GoalUpdate) => ipcRenderer.invoke('goals:update', data),
    delete: (id: number) => ipcRenderer.invoke('goals:delete', id)
  },
  auth: {
    getState: () => ipcRenderer.invoke('auth:getState'),
    connect: (clientId: string, clientSecret: string) => ipcRenderer.invoke('auth:connect', clientId, clientSecret),
    cancelConnect: () => ipcRenderer.invoke('auth:cancelConnect'),
    disconnect: () => ipcRenderer.invoke('auth:disconnect')
  },
  youtube: {
    syncVideos: () => ipcRenderer.invoke('youtube:syncVideos'),
    fetchVideoStats: (ids: string[]) => ipcRenderer.invoke('youtube:fetchVideoStats', ids),
    fetchAnalytics: (days: number) => ipcRenderer.invoke('youtube:fetchAnalytics', days),
    getCachedAnalytics: (days: number) => ipcRenderer.invoke('youtube:getCachedAnalytics', days),
    getCachedVideoStats: () => ipcRenderer.invoke('youtube:getCachedVideoStats'),
    getClientId: () => ipcRenderer.invoke('youtube:getClientId')
  },
  upload: {
    getQueue: (): Promise<QueueItem[]> => ipcRenderer.invoke('youtube:getQueue'),
    addToQueue: (data: QueueItemCreate): Promise<QueueItem> => ipcRenderer.invoke('youtube:addToQueue', data),
    removeFromQueue: (id: number): Promise<void> => ipcRenderer.invoke('youtube:removeFromQueue', id),
    startUpload: (queueItemId: number): Promise<{ started: boolean }> => ipcRenderer.invoke('youtube:startUpload', queueItemId),
    onProgress: (cb: (data: UploadProgressEvent) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: UploadProgressEvent) => cb(data)
      ipcRenderer.on('youtube:uploadProgress', handler)
      return () => ipcRenderer.off('youtube:uploadProgress', handler)
    },
    onQueueUpdate: (cb: (items: QueueItem[]) => void): (() => void) => {
      const handler = (_: Electron.IpcRendererEvent, items: QueueItem[]) => cb(items)
      ipcRenderer.on('youtube:queueUpdate', handler)
      return () => ipcRenderer.off('youtube:queueUpdate', handler)
    }
  },
  dialog: {
    openFile: (options: {
      title?: string
      filters?: { name: string; extensions: string[] }[]
      properties?: string[]
    }): Promise<{ canceled: boolean; filePaths: string[] }> =>
      ipcRenderer.invoke('dialog:openFile', options),
    saveFile: (options: {
      title?: string
      defaultPath?: string
      filters?: { name: string; extensions: string[] }[]
    }): Promise<{ canceled: boolean; filePath?: string }> =>
      ipcRenderer.invoke('dialog:saveFile', options)
  },
  export: {
    channelReport: (): Promise<{ saved: boolean; path?: string }> =>
      ipcRenderer.invoke('export:channelReport')
  },
  update: {
    install: (): Promise<void> => ipcRenderer.invoke('update:install'),
    onAvailable: (cb: (info: { version: string }) => void): (() => void) => {
      const h = (_: Electron.IpcRendererEvent, info: { version: string }) => cb(info)
      ipcRenderer.on('update:available', h)
      return () => ipcRenderer.off('update:available', h)
    },
    onProgress: (cb: (pct: number) => void): (() => void) => {
      const h = (_: Electron.IpcRendererEvent, pct: number) => cb(pct)
      ipcRenderer.on('update:progress', h)
      return () => ipcRenderer.off('update:progress', h)
    },
    onDownloaded: (cb: (info: { version: string }) => void): (() => void) => {
      const h = (_: Electron.IpcRendererEvent, info: { version: string }) => cb(info)
      ipcRenderer.on('update:downloaded', h)
      return () => ipcRenderer.off('update:downloaded', h)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
