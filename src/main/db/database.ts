import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    const userDataPath = app.getPath('userData')
    mkdirSync(userDataPath, { recursive: true })
    const dbPath = join(userDataPath, 'tracker.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    migrate(db)
  }
  return db
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
    db.pragma('user_version = 5')
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
    db.pragma('user_version = 5')
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
    db.pragma('user_version = 5')
  }

  // Users on Phase 3 (version 3) need Phase 4 + 5 tables.
  if (version === 3) {
    try { db.exec(`ALTER TABLE videos ADD COLUMN thumbnail_path TEXT`) } catch {}
    try { db.exec(`ALTER TABLE videos ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`) } catch {}
    db.exec(PHASE4_TABLES)
    db.exec(PHASE5_TRIGGER)
    seedStageHistory(db)
    db.pragma('user_version = 5')
  }

  // v5: archived flag + initial-stage history trigger
  if (version === 4) {
    try { db.exec(`ALTER TABLE videos ADD COLUMN archived INTEGER NOT NULL DEFAULT 0`) } catch {}
    db.exec(PHASE5_TRIGGER)
    db.pragma('user_version = 5')
  }

  // On every startup: reset any stuck 'uploading' items back to 'queued'
  try {
    db.prepare("UPDATE publish_queue SET status = 'queued', progress = 0 WHERE status = 'uploading'").run()
  } catch {}
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
