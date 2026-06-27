import type {
  Video, VideoCreate, VideoUpdate,
  Series, SeriesCreate, SeriesUpdate,
  Goal, GoalCreate, GoalUpdate,
  AuthState, SyncResult, VideoStats, DailyMetric, ChannelStats,
  QueueItem, QueueItemCreate, StageEvent, UploadProgressEvent,
  UserProfile, LevelHistoryEntry, Reward, Account,
  ProductionStats
} from '../shared/types'

declare global {
  interface Window {
    api: {
      videos: {
        getAll: () => Promise<Video[]>
        getArchived: () => Promise<Video[]>
        get: (id: number) => Promise<Video | undefined>
        create: (data: VideoCreate) => Promise<Video>
        update: (data: VideoUpdate) => Promise<Video>
        delete: (id: number) => Promise<void>
        getStageHistory: (id: number) => Promise<StageEvent[]>
      }
      series: {
        getAll: () => Promise<Series[]>
        get: (id: number) => Promise<Series | undefined>
        create: (data: SeriesCreate) => Promise<Series>
        update: (data: SeriesUpdate) => Promise<Series>
        delete: (id: number) => Promise<void>
        getVideos: (seriesId: number) => Promise<Video[]>
        setEpisodeOrder: (videoId: number, order: number) => Promise<void>
      }
      goals: {
        getAll: () => Promise<Goal[]>
        create: (data: GoalCreate) => Promise<Goal>
        update: (data: GoalUpdate) => Promise<Goal>
        delete: (id: number) => Promise<void>
      }
      auth: {
        getState: () => Promise<AuthState>
        connect: (clientId: string, clientSecret: string) => Promise<AuthState>
        cancelConnect: () => Promise<void>
        disconnect: () => Promise<AuthState>
      }
      youtube: {
        syncVideos: () => Promise<SyncResult>
        fetchVideoStats: (ids: string[]) => Promise<VideoStats[]>
        fetchAnalytics: (days: number) => Promise<{ daily: DailyMetric[]; channelStats: ChannelStats }>
        getCachedAnalytics: (days: number) => Promise<{ daily: DailyMetric[]; staleMinutes: number }>
        getCachedVideoStats: () => Promise<VideoStats[]>
        getClientId: () => Promise<string>
      }
      upload: {
        getQueue: () => Promise<QueueItem[]>
        addToQueue: (data: QueueItemCreate) => Promise<QueueItem>
        removeFromQueue: (id: number) => Promise<void>
        startUpload: (queueItemId: number) => Promise<{ started: boolean }>
        onProgress: (cb: (data: UploadProgressEvent) => void) => () => void
        onQueueUpdate: (cb: (items: QueueItem[]) => void) => () => void
      }
      dialog: {
        openFile: (options: {
          title?: string
          filters?: { name: string; extensions: string[] }[]
          properties?: string[]
        }) => Promise<{ canceled: boolean; filePaths: string[] }>
        openFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>
        saveFile: (options: {
          title?: string
          defaultPath?: string
          filters?: { name: string; extensions: string[] }[]
        }) => Promise<{ canceled: boolean; filePath?: string }>
      }
      shell: {
        openPath: (path: string) => Promise<string>
      }
      export: {
        channelReport: () => Promise<{ saved: boolean; path?: string }>
      }
      accounts: {
        getAll:    () => Promise<Account[]>
        getActive: () => Promise<string>
        create:    (name: string) => Promise<Account>
        rename:    (id: string, name: string) => Promise<Account[]>
        delete:    (id: string) => Promise<Account[]>
        switch:    (id: string) => Promise<void>
      }
      profile: {
        get:             () => Promise<UserProfile>
        getLevelHistory: () => Promise<LevelHistoryEntry[]>
        getRewards:      () => Promise<Reward[]>
        getStats:        () => Promise<{ ideasAdded: number }>
      }
      productionAnalytics: {
        getStats: () => Promise<ProductionStats>
      }
      update: {
        install: () => Promise<void>
        onAvailable: (cb: (info: { version: string }) => void) => () => void
        onProgress: (cb: (pct: number) => void) => () => void
        onDownloaded: (cb: (info: { version: string }) => void) => () => void
        onError: (cb: (message: string) => void) => () => void
      }
    }
  }
}
