export interface Account {
  id: string
  name: string
  createdAt: string
}

export type Stage =
  | 'idea'
  | 'script'
  | 'filming'
  | 'editing'
  | 'scheduled'
  | 'published'

export type Priority = 'low' | 'medium' | 'high'

export interface Video {
  id: number
  title: string
  description: string
  tags: string        // comma-separated
  thumbnail_concept: string
  priority: Priority
  stage: Stage
  series_id: number | null
  episode_order: number
  scheduled_date: string | null  // ISO date string
  notes: string
  youtube_video_id: string | null
  thumbnail_path: string | null
  archived: 0 | 1
  script_path: string | null
  script_word_count: number | null
  script_draft_quality: 'rough' | 'final' | null
  assets_folder_path: string | null
  created_at: string
  updated_at: string
}

export type VideoCreate = Omit<Video, 'id' | 'created_at' | 'updated_at'>
export type VideoUpdate = Partial<VideoCreate> & { id: number }

export interface Series {
  id: number
  name: string
  description: string
  created_at: string
}

export type SeriesCreate = Omit<Series, 'id' | 'created_at'>
export type SeriesUpdate = Partial<SeriesCreate> & { id: number }

export type GoalType = 'subscribers' | 'views' | 'videos_per_month' | 'revenue' | 'watch_hours'

export interface Goal {
  id: number
  title: string
  goal_type: GoalType
  target_value: number
  current_value: number
  deadline: string | null
  created_at: string
  updated_at: string
}

export type GoalCreate = Omit<Goal, 'id' | 'created_at' | 'updated_at'>
export type GoalUpdate = Partial<GoalCreate> & { id: number }

// YouTube / Analytics types
export interface AuthState {
  connected: boolean
  channelId: string | null
  channelName: string | null
  channelThumb: string | null
  lastSyncAt: string | null
}

export interface ChannelStats {
  channelId: string
  channelName: string
  channelThumb: string
  subscribers: number
  totalViews: number
  videoCount: number
}

export interface VideoStats {
  youtube_video_id: string
  title: string
  publishedAt: string
  thumbnail: string
  views: number
  likes: number
  comments: number
  watchMinutes: number
  ctr: number | null
  avgViewPct: number | null
}

export interface DailyMetric {
  date: string
  views: number
  subscribersGained: number
  watchMinutes: number
}

export interface SyncResult {
  created: number
  matched: number
  total: number
}

export type UploadStatus = 'queued' | 'uploading' | 'scheduled' | 'live' | 'failed'

export interface QueueItem {
  id: number
  video_id: number
  local_file_path: string
  thumbnail_path: string | null
  yt_title: string
  yt_description: string
  yt_tags: string
  yt_category: string
  yt_visibility: 'public' | 'unlisted' | 'private'
  publish_at: string | null
  status: UploadStatus
  youtube_video_id: string | null
  error_message: string | null
  progress: number
  created_at: string
  updated_at: string
}

export type QueueItemCreate = {
  video_id: number
  local_file_path: string
  thumbnail_path: string | null
  yt_title: string
  yt_description: string
  yt_tags: string
  yt_category: string
  yt_visibility: 'public' | 'unlisted' | 'private'
  publish_at: string | null
}

export interface StageEvent {
  id: number
  video_id: number
  stage: Stage
  changed_at: string
}

export interface UploadProgressEvent {
  queueItemId: number
  progress: number
  status: UploadStatus
}

// ─── Gamification ──────────────────────────────────────────────────────────

export interface Substep {
  id: number
  step_id: number
  title: string
  position: number
  completed_at: string | null
}

export interface Step {
  id: number
  idea_id: number
  title: string
  position: number
  completed_at: string | null
  substeps: Substep[]
}

export interface UserProfile {
  id: number
  current_xp: number
  current_level: number
  total_xp_earned: number
}

export interface LevelHistoryEntry {
  id: number
  level: number
  achieved_at: string
  xp_at_achievement: number
}

export interface Reward {
  id: number
  reward_type: string
  reward_key: string
  unlocked_at_level: number
  label: string
  unlocked_at: string | null
}

export interface XPResult {
  profile: UserProfile
  leveledUp: boolean
  newLevel?: number
  newUnlocks: Reward[]
}

// ─── Production Analytics ───────────────────────────────────────────────────

export interface StageAvgDays {
  stage: string
  avg_days: number
  transitions: number
}

export interface FunnelCount {
  stage: string
  count: number
}

export interface VideoTimeStat {
  id: number
  title: string
  days_to_publish: number
}

export interface ProductionStats {
  stageAvgDays: StageAvgDays[]
  funnelCounts: FunnelCount[]
  totalIdeas: number
  publishedCount: number
  conversionRate: number
  fastestVideos: VideoTimeStat[]
  slowestVideos: VideoTimeStat[]
  bottleneck: string | null
}
