import { requireNativeModule, type EventSubscription } from 'expo-modules-core';

// 로컬 네이티브 모듈 (CLAUDE.md 결정 #9 · docs/PLAYER_SYSTEM.md §5)

export interface TtsEngine {
  name: string;
  label: string;
}

export interface TtsVoice {
  name: string;
  locale: string;
  language: string;
  quality: number;
  isDefault: boolean;
}

export interface QueueItem {
  id: string;
  uri: string;
  title: string;
  subtitle: string;
}

export interface QueueOptions {
  /** 0 = 무한 */
  repeat: number;
  shuffle: boolean;
  speed: number;
  /** false 면 뒤에 appendItems 가 더 온다 (점진 합성) */
  complete: boolean;
}

export interface PlayerState {
  isPlaying: boolean;
  index: number;
  itemId: string | null;
  loop: number;
  repeat: number;
  shuffle: boolean;
  speed: number;
  /** epoch ms, 0 = 없음 */
  sleepAt: number;
  sleepEndOfLoop: boolean;
  ended: boolean;
  queueLength: number;
  complete: boolean;
}

interface SentenceAudioNative {
  getEngines(): Promise<{ engines: TtsEngine[]; defaultEngine: string | null }>;
  getVoices(engine: string | null): Promise<TtsVoice[]>;
  synthesize(
    text: string,
    engine: string | null,
    voice: string | null,
    rate: number,
    pitch: number,
    outUri: string,
  ): Promise<void>;
  padSilence(srcUri: string, dstUri: string, gapMs: number): Promise<void>;

  setQueue(items: QueueItem[], startIndex: number, options: QueueOptions): Promise<void>;
  appendItems(items: QueueItem[]): Promise<void>;
  insertItems(index: number, items: QueueItem[]): Promise<void>;
  markQueueComplete(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seekToIndex(index: number): Promise<void>;
  seekToItem(id: string): Promise<void>;
  stop(): Promise<void>;
  setRepeat(n: number): Promise<void>;
  setShuffle(on: boolean): Promise<void>;
  setSpeed(x: number): Promise<void>;
  setSleepTimer(ms: number, endOfLoop: boolean): Promise<void>;
  getState(): Promise<PlayerState>;
  addListener(event: 'onPlayerState', cb: (state: PlayerState) => void): EventSubscription;
}

export const SentenceAudio = requireNativeModule<SentenceAudioNative>('SentenceAudio');
