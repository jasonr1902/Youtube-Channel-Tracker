import { getDb } from './database'
import type { UserProfile, XPResult, LevelHistoryEntry, Reward } from '../../shared/types'

export function xpToNextLevel(level: number): number {
  return Math.round(100 * Math.pow(level + 1, 1.8))
}

const STAGE_ORDER = ['idea', 'script', 'filming', 'editing', 'scheduled', 'published']

// XP values
const XP_NEW_IDEA     = 50
const XP_PER_STAGE    = 100
const XP_PER_100_VIEWS = 1
const XP_PER_COMMENT  = 5
const XP_PER_SUB      = 20

// ─── Profile ───────────────────────────────────────────────────────────────

function ensureProfile(): UserProfile {
  const db = getDb()
  const row = db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as UserProfile | undefined
  if (row) return row
  db.prepare('INSERT OR IGNORE INTO user_profile (id, current_xp, current_level, total_xp_earned) VALUES (1,0,0,0)').run()
  return db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as UserProfile
}

export function getProfile(): UserProfile { return ensureProfile() }

export function getLevelHistory(): LevelHistoryEntry[] {
  return getDb().prepare('SELECT * FROM level_history ORDER BY level ASC').all() as LevelHistoryEntry[]
}

export function getRewards(): Reward[] {
  return getDb().prepare(`
    SELECT r.*, u.unlocked_at
    FROM rewards r
    LEFT JOIN user_unlocks u ON u.reward_id = r.id
    ORDER BY r.unlocked_at_level ASC
  `).all() as Reward[]
}

export function getProfileStats(): { ideasAdded: number } {
  const db = getDb()
  const ideasAdded = (db.prepare('SELECT COUNT(*) as c FROM videos WHERE archived = 0').get() as { c: number }).c
  return { ideasAdded }
}

// ─── Internal XP math ──────────────────────────────────────────────────────

export function awardXP(amount: number): XPResult {
  const db = getDb()
  const p = ensureProfile()
  p.current_xp += amount
  p.total_xp_earned += amount

  let leveledUp = false
  const newUnlocks: Reward[] = []

  while (p.current_xp >= xpToNextLevel(p.current_level)) {
    p.current_xp -= xpToNextLevel(p.current_level)
    p.current_level++
    leveledUp = true
    db.prepare('INSERT INTO level_history (level, xp_at_achievement) VALUES (?,?)').run(p.current_level, p.total_xp_earned)
    const unlocked = db.prepare(`
      SELECT r.* FROM rewards r
      WHERE r.unlocked_at_level = ?
      AND r.id NOT IN (SELECT reward_id FROM user_unlocks)
    `).all(p.current_level) as Reward[]
    for (const r of unlocked) {
      db.prepare('INSERT INTO user_unlocks (reward_id) VALUES (?)').run(r.id)
      newUnlocks.push({ ...r, unlocked_at: new Date().toISOString() })
    }
  }

  db.prepare('UPDATE user_profile SET current_xp=?,current_level=?,total_xp_earned=? WHERE id=1')
    .run(p.current_xp, p.current_level, p.total_xp_earned)
  return { profile: p, leveledUp, newLevel: leveledUp ? p.current_level : undefined, newUnlocks }
}

// ─── XP Sources ────────────────────────────────────────────────────────────

export function awardXpForNewIdea(): XPResult {
  return awardXP(XP_NEW_IDEA)
}

export function awardXpForStageChange(fromStage: string, toStage: string): XPResult | null {
  const fromIdx = STAGE_ORDER.indexOf(fromStage)
  const toIdx   = STAGE_ORDER.indexOf(toStage)
  if (fromIdx < 0 || toIdx < 0 || toIdx <= fromIdx) return null
  return awardXP(XP_PER_STAGE * (toIdx - fromIdx))
}

export function awardXpForAnalytics(): XPResult | null {
  const db = getDb()
  db.prepare(
    'INSERT OR IGNORE INTO xp_analytics_credits (id,views_credited,comments_credited,subs_credited) VALUES (1,0,0,0)'
  ).run()

  const credits = db.prepare('SELECT * FROM xp_analytics_credits WHERE id=1').get() as
    { views_credited: number; comments_credited: number; subs_credited: number }

  const totals = db.prepare(
    'SELECT COALESCE(SUM(views),0) as views, COALESCE(SUM(comments),0) as comments FROM youtube_video_stats'
  ).get() as { views: number; comments: number }

  const subsRow = db.prepare(
    'SELECT COALESCE(SUM(subscribers_gained),0) as subs FROM channel_daily'
  ).get() as { subs: number }

  const newViews    = Math.max(0, totals.views    - credits.views_credited)
  const newComments = Math.max(0, totals.comments - credits.comments_credited)
  const newSubs     = Math.max(0, subsRow.subs    - credits.subs_credited)

  const xp = Math.floor(newViews / 100) * XP_PER_100_VIEWS
           + newComments * XP_PER_COMMENT
           + newSubs     * XP_PER_SUB

  db.prepare('UPDATE xp_analytics_credits SET views_credited=?,comments_credited=?,subs_credited=? WHERE id=1')
    .run(totals.views, totals.comments, subsRow.subs)

  return xp > 0 ? awardXP(xp) : null
}
