# DATABASE — SQLite 스키마 · 마이그레이션

## 0. 구현 현황

| 항목 | 상태 |
|---|---|
| v1 스키마(presets · sentences · playlists · playlist_items · settings) | ✅ `db/index.ts` |

---

## 1. 규약 (LinkMemo 승계)

- `db/index.ts` 의 `MIGRATIONS` 배열에 **추가만** 한다. `PRAGMA user_version` 이 적용된 개수다.
- `PRAGMA foreign_keys = ON` 을 연결마다 켠다. SQLite 기본은 OFF 이고, 삭제 규칙(CLAUDE.md §5)이 전부 FK 에 달려 있다.
- id 는 `expo-crypto` `randomUUID()` 문자열. 시각은 epoch ms 정수.

## 2. v1 스키마

```sql
CREATE TABLE presets (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  engine     TEXT,                 -- NULL = 기기 기본 엔진
  voice      TEXT,                 -- NULL = 엔진 기본 목소리
  rate       REAL NOT NULL DEFAULT 1.0,
  pitch      REAL NOT NULL DEFAULT 1.0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE sentences (
  id         TEXT PRIMARY KEY,
  text       TEXT NOT NULL,
  preset_id  TEXT REFERENCES presets(id) ON DELETE SET NULL,  -- NULL = 기본 프리셋
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
  id          TEXT PRIMARY KEY,     -- 같은 문장 중복 허용(결정 #12) → 항목 자체 id
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
```

## 3. `settings` 키

| 키 | 값 | 기본 |
|---|---|---|
| `default_preset_id` | 프리셋 id | 첫 실행에 만든 프리셋 |
| `repeat` | `0`(무한) · `1..99` | `1` |
| `gap_ms` | `0..5000` (500 단위) | `1000` |
| `shuffle` | `0` · `1` | `0` |
| `speed` | `0.75` · `1` · `1.25` · `1.5` | `1` |

## 4. 정렬

- 문장 목록: 최근 추가가 위(`created_at DESC`).
- 재생목록 목록: 최근 수정이 위(`updated_at DESC`).
- 재생목록 항목: `position ASC`. 순서를 바꾸면 그 재생목록의 position 을 0..n-1 로 다시 쓴다.
