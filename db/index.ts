import * as SQLite from 'expo-sqlite';

// 마이그레이션 규약: 배열에 추가만 한다(Expand-only). 상세는 docs/DATABASE.md.
const MIGRATIONS: string[] = [
  // v1: presets · sentences · playlists · playlist_items · settings (DATABASE.md §2)
  `
  CREATE TABLE presets (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    engine     TEXT,
    voice      TEXT,
    rate       REAL NOT NULL DEFAULT 1.0,
    pitch      REAL NOT NULL DEFAULT 1.0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE sentences (
    id         TEXT PRIMARY KEY,
    text       TEXT NOT NULL,
    preset_id  TEXT REFERENCES presets(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE playlists (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE playlist_items (
    id          TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    sentence_id TEXT NOT NULL REFERENCES sentences(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL
  );
  CREATE INDEX idx_items_playlist ON playlist_items(playlist_id, position);
  CREATE INDEX idx_items_sentence ON playlist_items(sentence_id);
  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (db) return db;
  const opened = SQLite.openDatabaseSync('sentencetts.db');
  opened.execSync('PRAGMA foreign_keys = ON'); // SQLite 기본 OFF. 삭제 규칙(CLAUDE.md §5)이 이 줄에 달려 있다
  migrate(opened);
  db = opened;
  return opened;
}

function migrate(database: SQLite.SQLiteDatabase) {
  const row = database.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    database.withTransactionSync(() => {
      database.execSync(MIGRATIONS[v]);
      database.execSync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

export function getSetting(key: string): string | null {
  const row = getDb().getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  getDb().runSync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}
