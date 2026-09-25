import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { Preset } from '@/features/library';
import { SentenceAudio, type TtsVoice } from '@/modules/sentence-audio';

// 합성 + 캐시 (docs/TTS_SYSTEM.md §3·§4)

function cacheDir(): Directory {
  const dir = new Directory(Paths.cache, 'tts');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

async function keyOf(text: string, preset: Preset): Promise<string> {
  const raw = [preset.engine ?? '', preset.voice ?? '', preset.rate.toFixed(2), preset.pitch.toFixed(2), text].join(
    '\u0001',
  );
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, raw);
}

/** 문장을 합성해 간격 무음을 붙인 WAV 의 file:// uri 를 돌려준다. 캐시에 있으면 바로 */
export async function ensureAudio(text: string, preset: Preset, gapMs: number): Promise<string> {
  const dir = cacheDir();
  const key = await keyOf(text, preset);
  const padded = new File(dir, `${key}_g${gapMs}.wav`);
  if (padded.exists && padded.size > 44) return padded.uri;

  const raw = new File(dir, `${key}.wav`);
  if (!raw.exists || raw.size <= 44) {
    await SentenceAudio.synthesize(text, preset.engine, preset.voice, preset.rate, preset.pitch, raw.uri);
  }
  await SentenceAudio.padSilence(raw.uri, padded.uri, gapMs);
  return padded.uri;
}

export function cacheSizeBytes(): number {
  const dir = cacheDir();
  let total = 0;
  for (const entry of dir.list()) {
    if (entry instanceof File) total += entry.size ?? 0;
  }
  return total;
}

export function clearCache() {
  const dir = new Directory(Paths.cache, 'tts');
  if (dir.exists) dir.delete();
}

// ── 엔진 · 목소리 ──

export async function listEngines() {
  return SentenceAudio.getEngines();
}

const voiceCache = new Map<string, TtsVoice[]>();

export async function listVoices(engine: string | null): Promise<TtsVoice[]> {
  const k = engine ?? '';
  const hit = voiceCache.get(k);
  if (hit) return hit;
  const voices = await SentenceAudio.getVoices(engine);
  voiceCache.set(k, voices);
  return voices;
}

/** 첫 실행 기본 프리셋의 목소리: 한국어 목소리가 있으면 그것 (TTS_SYSTEM.md §1) */
export async function pickKoreanVoice(): Promise<string | null> {
  try {
    const voices = await listVoices(null);
    const ko = voices.filter((v) => v.language === 'ko');
    return (ko.find((v) => v.isDefault) ?? ko[0])?.name ?? null;
  } catch {
    return null;
  }
}
