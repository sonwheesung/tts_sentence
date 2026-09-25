import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n from '@/lib/i18n';
import { ensureDefaultPreset, reloadLibrary } from '@/features/library';
import { startPlayerSync } from '@/features/player';
import { loadSettings } from '@/features/settings';
import { pickKoreanVoice } from '@/features/tts';
import { COLOR } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        reloadLibrary();
        loadSettings();
        startPlayerSync();
        // 첫 실행: 한국어 목소리로 기본 프리셋을 만든다 (TTS_SYSTEM.md §1)
        const voice = await pickKoreanVoice();
        ensureDefaultPreset(i18n.t('presetEdit.defaultName'), voice);
      } finally {
        if (alive) setReady(true);
        void SplashScreen.hideAsync();
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLOR.background } }} />
    </SafeAreaProvider>
  );
}
