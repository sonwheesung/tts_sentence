import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GapOption, RepeatOption, ShuffleOption, SpeedOption } from '@/components/playback-options';
import { Button, Screen, Section, TabTitle } from '@/components/ui';
import { cacheSizeBytes, clearCache } from '@/features/tts';
import { COLOR, SPACE, TYPE } from '@/theme';

// 설정 탭 (깊이 0)

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export default function SettingsTab() {
  const { t } = useTranslation();
  const [cacheSize, setCacheSize] = useState(0);

  useFocusEffect(
    useCallback(() => {
      try {
        setCacheSize(cacheSizeBytes());
      } catch {
        setCacheSize(0);
      }
    }, []),
  );

  return (
    <Screen>
      <TabTitle title={t('settings.title')} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.group}>{t('settings.playback')}</Text>
        <RepeatOption />
        <GapOption />
        <SpeedOption />
        <ShuffleOption />

        <View style={styles.divider} />
        <Section title={t('settings.voices')}>
          <Button
            label={t('settings.manageVoices')}
            icon="mic-outline"
            kind="secondary"
            onPress={() => router.push('/preset')}
          />
        </Section>

        <View style={styles.divider} />
        <Section title={t('settings.storage')}>
          <View style={styles.row}>
            <Text style={styles.body18}>{t('settings.cache', { size: formatBytes(cacheSize) })}</Text>
            <Button
              label={t('settings.clearCache')}
              kind="secondary"
              compact
              onPress={() => {
                clearCache();
                setCacheSize(0);
                Alert.alert(t('settings.clearCacheDone'));
              }}
            />
          </View>
        </Section>

        <Text style={styles.version}>{t('settings.version', { v: Constants.expoConfig?.version ?? '' })}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: SPACE.xxl },
  group: { ...TYPE.sub, color: COLOR.textFaint, paddingHorizontal: SPACE.xl, paddingTop: SPACE.sm },
  divider: { height: 8, backgroundColor: COLOR.surface, marginVertical: SPACE.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  body18: { ...TYPE.body, color: COLOR.text, flex: 1 },
  version: { ...TYPE.caption, color: COLOR.textFaint, textAlign: 'center', paddingTop: SPACE.xl },
});
