import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('cbt.db');
  await runMigrations(_db);
  return _db;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = WAL;`);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mood_entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      score      INTEGER NOT NULL CHECK(score >= 1 AND score <= 10),
      note       TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS thought_records (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      situation         TEXT,
      automatic_thought TEXT,
      emotions          TEXT,
      distortion        TEXT,
      balanced_thought  TEXT,
      status            TEXT NOT NULL DEFAULT 'in_progress',
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gratitude_entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      items      TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      role       TEXT NOT NULL,
      content    TEXT NOT NULL,
      session_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session
      ON messages(session_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_mood_created
      ON mood_entries(created_at);

    -- Per-message analysis of the user's own turns across ALL conversations
    -- (free chat + driving mode), so thinking patterns aren't limited to the
    -- handful of formal thought records. Arrays stored as JSON text. One row
    -- per analyzed user message; empty arrays mark "analyzed, nothing found".
    CREATE TABLE IF NOT EXISTS message_insights (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id  INTEGER NOT NULL UNIQUE,
      session_id  TEXT NOT NULL,
      distortions TEXT NOT NULL DEFAULT '[]',
      emotions    TEXT NOT NULL DEFAULT '[]',
      topics      TEXT NOT NULL DEFAULT '[]',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_insights_message
      ON message_insights(message_id);
  `);
}
