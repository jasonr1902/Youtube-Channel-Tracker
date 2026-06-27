import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname } from 'path'
import { getActiveAccountId, getAccountDbPath } from './accounts'

let db: Database.Database | undefined

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = getAccountDbPath(getActiveAccountId())
    mkdirSync(dirname(dbPath), { recursive: true })
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    migrate(db)
  }
  return db
}

export function closeDb(): void {
  if (db) {
    try { db.close() } catch {}
    db = undefined
  }
}

const PHASE5_TRIGGER = `
  CREATE TRIGGER IF NOT EXISTS track_initial_stage
    AFTER INSERT ON videos FOR EACH ROW BEGIN
      INSERT INTO video_stage_history (video_id, stage, changed_at)
        VALUES (NEW.id, NEW.stage, NEW.created_at);
    END;
`

const PHASE4_TABLES = `
  CREATE TABLE IF NOT EXISTS publish_queue (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id         INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    local_file_path  TEXT NOT NULL,
    thumbnail_path   TEXT,
    yt_title         TEXT NOT NULL,
    yt_description   TEXT NOT NULL DEFAULT '',
    yt_tags          TEXT NOT NULL DEFAULT '',
    yt_category      TEXT NOT NULL DEFAULT '22',
    yt_visibility    TEXT NOT NULL DEFAULT 'public' CHECK(yt_visibility IN ('public','unlisted','private')),
    publish_at       TEXT,
    status           TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','uploading','scheduled','live','failed')),
    youtube_video_id TEXT,
    error_message    TEXT,
    progress         INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS video_stage_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id   INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    stage      TEXT NOT NULL,
    changed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TRIGGER IF NOT EXISTS track_stage_changes
    AFTER UPDATE OF stage ON videos
    FOR EACH ROW WHEN OLD.stage != NEW.stage BEGIN
      INSERT INTO video_stage_history (video_id, stage) VALUES (NEW.id, NEW.stage);
    END;
`

function migrate(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true }) as number

  if (version < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS series (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS videos (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        title             TEXT NOT NULL,
        description       TEXT NOT NULL DEFAULT '',
        tags              TEXT NOT NULL DEFAULT '',
        thumbnail_concept TEXT NOT NULL DEFAULT '',
        priority          TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
        stage             TEXT NOT NULL DEFAULT 'idea'   CHECK(stage IN ('idea','script','filming','editing','scheduled','published')),
        series_id         INTEGER REFERENCES series(id) ON DELETE SET NULL,
        episode_order     INTEGER NOT NULL DEFAULT 0,
        scheduled_date    TEXT,
        notes             TEXT NOT NULL DEFAULT '',
        youtube_video_id  TEXT,
        thumbnail_path    TEXT,
        archived          INTEGER NOT NULL DEFAULT 0,
        script_path       TEXT,
        script_word_count INTEGER,
        script_draft_quality TEXT,
        assets_folder_path TEXT,
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TRIGGER IF NOT EXISTS videos_updated_at
        AFTER UPDATE ON videos FOR EACH ROW BEGIN
          UPDATE videos SET updated_at = datetime('now') WHERE id = OLD.id;
        END;
      CREATE TABLE IF NOT EXISTS goals (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        title         TEXT NOT NULL,
        goal_type     TEXT NOT NULL CHECK(goal_type IN ('subscribers','views','videos_per_month','revenue','watch_hours')),
        target_value  REAL NOT NULL,
        current_value REAL NOT NULL DEFAULT 0,
        deadline      TEXT,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TRIGGER IF NOT EXISTS goals_updated_at
        AFTER UPDATE ON goals FOR EACH ROW BEGIN
          UPDATE goals SET updated_at = datetime('now') WHERE id = OLD.id;
        END;
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS youtube_video_stats (
        youtube_video_id TEXT PRIMARY KEY,
        views            INTEGER NOT NULL DEFAULT 0,
        likes            INTEGER NOT NULL DEFAULT 0,
        comments         INTEGER NOT NULL DEFAULT 0,
        watch_minutes    INTEGER NOT NULL DEFAULT 0,
        ctr              REAL,
        avg_view_pct     REAL,
        fetched_at       TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS channel_daily (
        date                TEXT PRIMARY KEY,
        views               INTEGER NOT NULL DEFAULT 0,
        subscribers_gained  INTEGER NOT NULL DEFAULT 0,
        watch_minutes       INTEGER NOT NULL DEFAULT 0
      );
    `)
    db.exec(PHASE4_TABLES)
    db.exec(PHASE5_TRIGGER)
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_path TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_word_count INTEGER`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_draft_quality TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN assets_folder_path TEXT`) } catch {}
    db.pragma('user_version = 6')
    migrateToV7(db)
  }

  // Users starting from Phase 1 (version 0) already have base tables.
  if (version === 0) {
    try { db.exec(`ALTER TABLE videos ADD COLUMN episode_order INTEGER NOT NULL DEFAULT 0`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN youtube_video_id TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN thumbnail_path TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`) } catch {}
    db.exec(`
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
        goal_type TEXT NOT NULL CHECK(goal_type IN ('subscribers','views','videos_per_month','revenue','watch_hours')),
        target_value REAL NOT NULL, current_value REAL NOT NULL DEFAULT 0, deadline TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TRIGGER IF NOT EXISTS goals_updated_at AFTER UPDATE ON goals FOR EACH ROW BEGIN
        UPDATE goals SET updated_at = datetime('now') WHERE id = OLD.id; END;
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS youtube_video_stats (
        youtube_video_id TEXT PRIMARY KEY, views INTEGER NOT NULL DEFAULT 0,
        likes INTEGER NOT NULL DEFAULT 0, comments INTEGER NOT NULL DEFAULT 0,
        watch_minutes INTEGER NOT NULL DEFAULT 0, ctr REAL, avg_view_pct REAL,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS channel_daily (
        date TEXT PRIMARY KEY, views INTEGER NOT NULL DEFAULT 0,
        subscribers_gained INTEGER NOT NULL DEFAULT 0, watch_minutes INTEGER NOT NULL DEFAULT 0
      );
    `)
    db.exec(PHASE4_TABLES)
    db.exec(PHASE5_TRIGGER)
    seedStageHistory(db)
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_path TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_word_count INTEGER`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_draft_quality TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN assets_folder_path TEXT`) } catch {}
    db.pragma('user_version = 6')
    migrateToV7(db)
  }

  // Users who ran through Phase 2 (version 2) need Phase 3 + 4 additions.
  if (version === 2) {
    try { db.exec(`ALTER TABLE videos ADD COLUMN youtube_video_id TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN thumbnail_path TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`) } catch {}
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS youtube_video_stats (
        youtube_video_id TEXT PRIMARY KEY, views INTEGER NOT NULL DEFAULT 0,
        likes INTEGER NOT NULL DEFAULT 0, comments INTEGER NOT NULL DEFAULT 0,
        watch_minutes INTEGER NOT NULL DEFAULT 0, ctr REAL, avg_view_pct REAL,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS channel_daily (
        date TEXT PRIMARY KEY, views INTEGER NOT NULL DEFAULT 0,
        subscribers_gained INTEGER NOT NULL DEFAULT 0, watch_minutes INTEGER NOT NULL DEFAULT 0
      );
    `)
    db.exec(PHASE4_TABLES)
    db.exec(PHASE5_TRIGGER)
    seedStageHistory(db)
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_path TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_word_count INTEGER`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_draft_quality TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN assets_folder_path TEXT`) } catch {}
    db.pragma('user_version = 6')
    migrateToV7(db)
  }

  // Users on Phase 3 (version 3) need Phase 4 + 5 tables.
  if (version === 3) {
    try { db.exec(`ALTER TABLE videos ADD COLUMN thumbnail_path TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`) } catch {}
    db.exec(PHASE4_TABLES)
    db.exec(PHASE5_TRIGGER)
    seedStageHistory(db)
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_path TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_word_count INTEGER`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_draft_quality TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN assets_folder_path TEXT`) } catch {}
    db.pragma('user_version = 6')
    migrateToV7(db)
  }

  // v4: archived flag + initial-stage history trigger
  if (version === 4) {
    try { db.exec(`ALTER TABLE videos ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`) } catch {}
    db.exec(PHASE5_TRIGGER)
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_path TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_word_count INTEGER`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_draft_quality TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN assets_folder_path TEXT`) } catch {}
    db.pragma('user_version = 6')
    migrateToV7(db)
  }

  // v5→v7: script attachment + assets folder + gamification
  if (version === 5) {
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_path TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_word_count INTEGER`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN script_draft_quality TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN assets_folder_path TEXT`) } catch {}
    db.pragma('user_version = 6')
    migrateToV7(db)
  }

  // v7: gamification tables
  if (version === 6) {
    migrateToV7(db)
  }

  // v8: analytics XP credit tracking
  if (version === 7) {
    migrateToV8(db)
  }

  // On every startup: reset any stuck 'uploading' items back to 'queued'
  try {
    db.prepare("UPDATE publish_queue SET status = 'queued', progress = 0 WHERE status = 'uploading'").run()
  } catch {}
}

function migrateToV8(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS xp_analytics_credits (
      id                INTEGER PRIMARY KEY CHECK (id = 1),
      views_credited    INTEGER NOT NULL DEFAULT 0,
      comments_credited INTEGER NOT NULL DEFAULT 0,
      subs_credited     INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO xp_analytics_credits (id, views_credited, comments_credited, subs_credited) VALUES (1,0,0,0);
  `)
  db.pragma('user_version = 8')
}

function migrateToV7(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS idea_steps (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      idea_id      INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      position     INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS idea_steps_sub (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      step_id      INTEGER NOT NULL REFERENCES idea_steps(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      position     INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS user_profile (
      id              INTEGER PRIMARY KEY,
      current_xp      INTEGER NOT NULL DEFAULT 0,
      current_level   INTEGER NOT NULL DEFAULT 0,
      total_xp_earned INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO user_profile (id, current_xp, current_level, total_xp_earned) VALUES (1,0,0,0);
    CREATE TABLE IF NOT EXISTS level_history (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      level             INTEGER NOT NULL,
      achieved_at       TEXT NOT NULL DEFAULT (datetime('now')),
      xp_at_achievement INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS rewards (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      reward_type      TEXT NOT NULL DEFAULT 'badge',
      reward_key       TEXT NOT NULL UNIQUE,
      unlocked_at_level INTEGER NOT NULL,
      label            TEXT NOT NULL
    );
    INSERT OR IGNORE INTO rewards (reward_type, reward_key, unlocked_at_level, label) VALUES
      ('badge','first_step',1,'First Step'),
      ('badge','getting_started',5,'Getting Started'),
      ('badge','rising_creator',10,'Rising Creator'),
      ('badge','dedicated',25,'Dedicated Creator'),
      ('badge','machine',50,'Content Machine'),
      ('badge','legend',100,'Legend');
    CREATE TABLE IF NOT EXISTS user_unlocks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      reward_id  INTEGER NOT NULL REFERENCES rewards(id),
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  db.pragma('user_version = 7')
  migrateToV8(db)
}

// Seed initial stage_history entry for each existing video (one-time, on upgrade)
function seedStageHistory(db: Database.Database): void {
  try {
    db.exec(`
      INSERT OR IGNORE INTO video_stage_history (video_id, stage, changed_at)
      SELECT id, stage, created_at FROM videos
    `)
  } catch {}
}
