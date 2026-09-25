import { create } from 'zustand';

import { resolvePreset, type Preset, type Sentence } from '@/features/library';
import { useSettings } from '@/features/settings';
import { ensureAudio } from '@/features/tts';
import { SentenceAudio, type PlayerState, type QueueItem } from '@/modules/sentence-audio';

// 재생 진입점. 대기열을 만들어 네이티브에 넘기고 상태를 받아 그린다 (docs/PLAYER_SYSTEM.md §4·§5).

export interface QueueEntry {
  /** 네이티브 mediaId. 재생목록이면 항목 id, 아니면 문장 id */
  itemId: string;
  sentence: Sentence;
}

interface PlayerStore {
  native: PlayerState | null;
  /** 지금 도는 대기열(JS 가 붙인 순서 그대로) */
  queue: QueueEntry[];
  sourceName: string;
  preparing: boolean;
  error: string | null;
}

export const usePlayer = create<PlayerStore>(() => ({
  native: null,
  queue: [],
  sourceName: '',
  preparing: false,
  error: null,
}));

let subscribed = false;

export function startPlayerSync() {
  if (subscribed) return;
  subscribed = true;
  SentenceAudio.addListener('onPlayerState', (native) => usePlayer.setState({ native }));
  SentenceAudio.getState()
    .then((native) => usePlayer.setState({ native }))
    .catch(() => {});
}

/** 재생을 누를 때마다 올라간다. 이전 점진 합성을 끊는 표시다 */
let generation = 0;

function toItem(entry: QueueEntry, uri: string, subtitle: string): QueueItem {
  const t = entry.sentence.text.replace(/\s+/g, ' ').trim();
  return {
    id: entry.itemId,
    uri,
    title: t.length > 40 ? `${t.slice(0, 40)}…` : t,
    subtitle,
  };
}

async function synth(entry: QueueEntry, gapMs: number): Promise<string> {
  const preset = resolvePreset(entry.sentence.presetId);
  return ensureAudio(entry.sentence.text, preset, gapMs);
}

/**
 * entries 를 startIndex 부터 재생한다. 누른 문장부터 곧바로 합성·재생하고 나머지는 뒤에 붙인다.
 * 재생 중 대기열은 편집과 따로 논다 (CLAUDE.md §5)
 */
export async function playEntries(entries: QueueEntry[], startIndex: number, sourceName: string) {
  if (entries.length === 0) return;
  const gen = ++generation;
  const { repeat, gapMs, shuffle, speed } = useSettings.getState();
  // 대기열은 목록 전체이고 누른 문장부터 시작한다(음악 앱과 같다). 1회면 누른 문장부터 끝까지,
  // 반복하면 다음 바퀴부터 처음부터 전체를 돈다 (PLAYER_SYSTEM.md §1)
  usePlayer.setState({ queue: entries, sourceName, preparing: true, error: null });

  let failed = 0;
  let start = Math.min(Math.max(0, startIndex), entries.length - 1);
  let firstUri: string | null = null;
  while (start < entries.length && firstUri === null) {
    try {
      firstUri = await synth(entries[start], gapMs);
    } catch {
      failed++;
      start++;
    }
    if (gen !== generation) return;
  }
  if (firstUri === null) {
    usePlayer.setState({ preparing: false, error: 'synth' });
    return;
  }

  const after = entries.slice(start + 1);
  const before = entries.slice(0, startIndex);
  await SentenceAudio.setQueue([toItem(entries[start], firstUri, sourceName)], 0, {
    repeat,
    shuffle,
    speed,
    complete: after.length === 0 && before.length === 0,
  });
  if (after.length === 0 && before.length === 0) {
    usePlayer.setState({ preparing: false });
    return;
  }

  // 뒤 문장부터 붙이고(곧 들을 차례다), 앞 문장은 현재 항목 앞에 끼운다
  for (const entry of after) {
    if (gen !== generation) return;
    try {
      const uri = await synth(entry, gapMs);
      if (gen !== generation) return;
      await SentenceAudio.appendItems([toItem(entry, uri, sourceName)]);
    } catch {
      failed++;
    }
  }
  let inserted = 0;
  for (const entry of before) {
    if (gen !== generation) return;
    try {
      const uri = await synth(entry, gapMs);
      if (gen !== generation) return;
      await SentenceAudio.insertItems(inserted, [toItem(entry, uri, sourceName)]);
      inserted++;
    } catch {
      failed++;
    }
  }
  if (gen !== generation) return;
  await SentenceAudio.markQueueComplete();
  usePlayer.setState({ preparing: false, error: failed > 0 ? 'partial' : null });
}

export function stopPlayback() {
  generation++;
  usePlayer.setState({ queue: [], sourceName: '', preparing: false });
  return SentenceAudio.stop();
}

export const playerControls = {
  play: () => SentenceAudio.play(),
  pause: () => SentenceAudio.pause(),
  next: () => SentenceAudio.next(),
  previous: () => SentenceAudio.previous(),
  seekToItem: (id: string) => SentenceAudio.seekToItem(id),
  setRepeat: (n: number) => SentenceAudio.setRepeat(n),
  setShuffle: (on: boolean) => SentenceAudio.setShuffle(on),
  setSpeed: (x: number) => SentenceAudio.setSpeed(x),
  setSleepTimer: (ms: number, endOfLoop: boolean) => SentenceAudio.setSleepTimer(ms, endOfLoop),
};

/** 지금 읽는 문장 */
export function currentEntry(state: PlayerStore): QueueEntry | undefined {
  const id = state.native?.itemId;
  if (!id) return undefined;
  return state.queue.find((e) => e.itemId === id);
}

/** 음성 프리셋 미리 듣기. 지금 대기열을 이 한 문장으로 바꾸고 한 번만 읽는다 */
export async function previewPreset(text: string, preset: Preset, label: string) {
  const gen = ++generation;
  const entry: QueueEntry = {
    itemId: `preview:${Date.now()}`,
    sentence: { id: '', text, presetId: preset.id || null, createdAt: 0 },
  };
  usePlayer.setState({ queue: [entry], sourceName: label, preparing: true, error: null });
  try {
    const uri = await ensureAudio(text, preset, 0);
    if (gen !== generation) return;
    await SentenceAudio.setQueue([toItem(entry, uri, label)], 0, {
      repeat: 1,
      shuffle: false,
      speed: 1,
      complete: true,
    });
    usePlayer.setState({ preparing: false });
  } catch {
    usePlayer.setState({ preparing: false, error: 'synth' });
  }
}
