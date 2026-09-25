import { create } from 'zustand';

import { getSetting, setSetting } from '@/db';

// 재생 설정 (docs/DATABASE.md §3). 값 범위의 정본은 PLAYER_SYSTEM.md.

export const REPEAT_MAX = 99;
export const GAP_OPTIONS_MS = [0, 500, 1000, 1500, 2000, 3000, 5000] as const;
export const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

interface PlaybackSettings {
  /** 0 = 무한 */
  repeat: number;
  gapMs: number;
  shuffle: boolean;
  speed: number;
}

export const useSettings = create<PlaybackSettings>(() => ({
  repeat: 1,
  gapMs: 1000,
  shuffle: false,
  speed: 1,
}));

function num(key: string, fallback: number): number {
  const v = getSetting(key);
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function loadSettings() {
  useSettings.setState({
    repeat: Math.min(REPEAT_MAX, Math.max(0, Math.round(num('repeat', 1)))),
    gapMs: Math.min(5000, Math.max(0, num('gap_ms', 1000))),
    shuffle: getSetting('shuffle') === '1',
    speed: num('speed', 1),
  });
}

export function saveRepeat(repeat: number) {
  setSetting('repeat', String(repeat));
  useSettings.setState({ repeat });
}

export function saveGap(gapMs: number) {
  setSetting('gap_ms', String(gapMs));
  useSettings.setState({ gapMs });
}

export function saveShuffle(shuffle: boolean) {
  setSetting('shuffle', shuffle ? '1' : '0');
  useSettings.setState({ shuffle });
}

export function saveSpeed(speed: number) {
  setSetting('speed', String(speed));
  useSettings.setState({ speed });
}
