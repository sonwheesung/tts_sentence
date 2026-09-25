import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import { getDb, getSetting, setSetting } from '@/db';

// 문장 · 음성 프리셋 · 재생목록의 기기 저장소 (docs/DATABASE.md).
// 데이터가 작아서 바뀔 때마다 전체를 다시 읽는다. 화면은 이 스토어만 본다.

export const MAX_SENTENCE_LENGTH = 1000; // CLAUDE.md §5 (placeholder 2026-09-25)

export interface Preset {
  id: string;
  name: string;
  engine: string | null;
  voice: string | null;
  rate: number;
  pitch: number;
}

export interface Sentence {
  id: string;
  text: string;
  presetId: string | null;
  createdAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  updatedAt: number;
  count: number;
}

export interface PlaylistItem {
  id: string;
  sentenceId: string;
  position: number;
}

interface LibraryState {
  loaded: boolean;
  presets: Preset[];
  defaultPresetId: string | null;
  sentences: Sentence[];
  playlists: Playlist[];
}

export const useLibrary = create<LibraryState>(() => ({
  loaded: false,
  presets: [],
  defaultPresetId: null,
  sentences: [],
  playlists: [],
}));

interface PresetRow {
  id: string;
  name: string;
  engine: string | null;
  voice: string | null;
  rate: number;
  pitch: number;
}

export function reloadLibrary() {
  const db = getDb();
  const presets = db.getAllSync<PresetRow>(
    'SELECT id, name, engine, voice, rate, pitch FROM presets ORDER BY sort_order ASC, created_at ASC',
  );
  const sentences = db
    .getAllSync<{ id: string; text: string; preset_id: string | null; created_at: number }>(
      'SELECT id, text, preset_id, created_at FROM sentences ORDER BY created_at DESC',
    )
    .map((r) => ({ id: r.id, text: r.text, presetId: r.preset_id, createdAt: r.created_at }));
  const playlists = db
    .getAllSync<{ id: string; name: string; updated_at: number; count: number }>(
      `SELECT p.id, p.name, p.updated_at, COUNT(i.id) AS count
       FROM playlists p LEFT JOIN playlist_items i ON i.playlist_id = p.id
       GROUP BY p.id ORDER BY p.updated_at DESC`,
    )
    .map((r) => ({ id: r.id, name: r.name, updatedAt: r.updated_at, count: r.count }));
  useLibrary.setState({
    loaded: true,
    presets,
    defaultPresetId: getSetting('default_preset_id'),
    sentences,
    playlists,
  });
}

// ── 프리셋 (docs/TTS_SYSTEM.md §1) ──

/** 첫 실행: 프리셋이 없으면 하나 만들어 기본으로 지정한다. 기본 id 가 사라졌으면 첫 프리셋으로 되돌린다 */
export function ensureDefaultPreset(name: string, voice: string | null) {
  const db = getDb();
  const count = db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM presets')?.n ?? 0;
  if (count === 0) {
    const id = createPreset({ name, engine: null, voice, rate: 1, pitch: 1 });
    setSetting('default_preset_id', id);
  } else {
    const current = getSetting('default_preset_id');
    const exists = current
      ? db.getFirstSync('SELECT id FROM presets WHERE id = ?', current)
      : null;
    if (!exists) {
      const first = db.getFirstSync<{ id: string }>(
        'SELECT id FROM presets ORDER BY sort_order ASC, created_at ASC',
      );
      if (first) setSetting('default_preset_id', first.id);
    }
  }
  reloadLibrary();
}

export function createPreset(p: Omit<Preset, 'id'>): string {
  const db = getDb();
  const id = randomUUID();
  const now = Date.now();
  const max = db.getFirstSync<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM presets')?.m ?? -1;
  db.runSync(
    'INSERT INTO presets (id, name, engine, voice, rate, pitch, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    p.name,
    p.engine,
    p.voice,
    p.rate,
    p.pitch,
    max + 1,
    now,
    now,
  );
  reloadLibrary();
  return id;
}

export function updatePreset(p: Preset) {
  getDb().runSync(
    'UPDATE presets SET name = ?, engine = ?, voice = ?, rate = ?, pitch = ?, updated_at = ? WHERE id = ?',
    p.name,
    p.engine,
    p.voice,
    p.rate,
    p.pitch,
    Date.now(),
    p.id,
  );
  reloadLibrary();
}

/** 기본 프리셋은 지울 수 없다 (CLAUDE.md §5). 쓰던 문장은 FK SET NULL 로 기본에 돌아간다 */
export function deletePreset(id: string): boolean {
  if (getSetting('default_preset_id') === id) return false;
  getDb().runSync('DELETE FROM presets WHERE id = ?', id);
  reloadLibrary();
  return true;
}

export function setDefaultPreset(id: string) {
  setSetting('default_preset_id', id);
  reloadLibrary();
}

/** 문장에 적용될 프리셋. 비어 있으면 **지금의** 기본 프리셋 (CLAUDE.md §5) */
export function resolvePreset(presetId: string | null): Preset {
  const { presets, defaultPresetId } = useLibrary.getState();
  return (
    (presetId ? presets.find((p) => p.id === presetId) : undefined) ??
    presets.find((p) => p.id === defaultPresetId) ??
    presets[0] ?? { id: '', name: '', engine: null, voice: null, rate: 1, pitch: 1 }
  );
}

// ── 문장 ──

export function createSentence(text: string, presetId: string | null): string {
  const id = randomUUID();
  const now = Date.now();
  getDb().runSync(
    'INSERT INTO sentences (id, text, preset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    id,
    text,
    presetId,
    now,
    now,
  );
  reloadLibrary();
  return id;
}

export function updateSentence(id: string, text: string, presetId: string | null) {
  getDb().runSync(
    'UPDATE sentences SET text = ?, preset_id = ?, updated_at = ? WHERE id = ?',
    text,
    presetId,
    Date.now(),
    id,
  );
  reloadLibrary();
}

/** 들어 있던 모든 재생목록에서도 빠진다 (FK CASCADE · 결정 #12) */
export function deleteSentence(id: string) {
  getDb().runSync('DELETE FROM sentences WHERE id = ?', id);
  reloadLibrary();
}

export function countPlaylistsContaining(sentenceId: string): number {
  return (
    getDb().getFirstSync<{ n: number }>(
      'SELECT COUNT(DISTINCT playlist_id) AS n FROM playlist_items WHERE sentence_id = ?',
      sentenceId,
    )?.n ?? 0
  );
}

// ── 재생목록 ──

export function createPlaylist(name: string): string {
  const id = randomUUID();
  const now = Date.now();
  getDb().runSync(
    'INSERT INTO playlists (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    id,
    name,
    now,
    now,
  );
  reloadLibrary();
  return id;
}

export function renamePlaylist(id: string, name: string) {
  getDb().runSync('UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?', name, Date.now(), id);
  reloadLibrary();
}

export function deletePlaylist(id: string) {
  getDb().runSync('DELETE FROM playlists WHERE id = ?', id);
  reloadLibrary();
}

export function getPlaylistItems(playlistId: string): PlaylistItem[] {
  return getDb()
    .getAllSync<{ id: string; sentence_id: string; position: number }>(
      'SELECT id, sentence_id, position FROM playlist_items WHERE playlist_id = ? ORDER BY position ASC',
      playlistId,
    )
    .map((r) => ({ id: r.id, sentenceId: r.sentence_id, position: r.position }));
}

function touchPlaylist(id: string) {
  getDb().runSync('UPDATE playlists SET updated_at = ? WHERE id = ?', Date.now(), id);
}

/** 같은 문장 중복 허용 (결정 #12). 끝에 붙인다 */
export function addToPlaylist(playlistId: string, sentenceIds: string[]) {
  const db = getDb();
  db.withTransactionSync(() => {
    let pos =
      (db.getFirstSync<{ m: number | null }>(
        'SELECT MAX(position) AS m FROM playlist_items WHERE playlist_id = ?',
        playlistId,
      )?.m ?? -1) + 1;
    for (const sid of sentenceIds) {
      db.runSync(
        'INSERT INTO playlist_items (id, playlist_id, sentence_id, position) VALUES (?, ?, ?, ?)',
        randomUUID(),
        playlistId,
        sid,
        pos++,
      );
    }
    touchPlaylist(playlistId);
  });
  reloadLibrary();
}

export function removeFromPlaylist(playlistId: string, itemId: string) {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM playlist_items WHERE id = ?', itemId);
    renumber(playlistId);
    touchPlaylist(playlistId);
  });
  reloadLibrary();
}

/** 항목 하나를 위/아래로 한 칸. 길게 눌러 끌기 대신 버튼으로 옮긴다 (UI_GUIDE.md §3) */
export function moveInPlaylist(playlistId: string, itemId: string, delta: -1 | 1) {
  const items = getPlaylistItems(playlistId);
  const from = items.findIndex((i) => i.id === itemId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= items.length) return;
  const reordered = [...items];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);
  const db = getDb();
  db.withTransactionSync(() => {
    reordered.forEach((it, idx) => {
      db.runSync('UPDATE playlist_items SET position = ? WHERE id = ?', idx, it.id);
    });
    touchPlaylist(playlistId);
  });
  reloadLibrary();
}

function renumber(playlistId: string) {
  const db = getDb();
  getPlaylistItems(playlistId).forEach((it, idx) => {
    db.runSync('UPDATE playlist_items SET position = ? WHERE id = ?', idx, it.id);
  });
}
