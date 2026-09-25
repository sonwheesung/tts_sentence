import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Linking, StyleSheet, Text, View } from 'react-native';

import { Button, Header, Screen } from '@/components/ui';
import { setDefaultPreset, useLibrary } from '@/features/library';
import { listVoices } from '@/features/tts';
import { COLOR, RADIUS, SPACE, TYPE } from '@/theme';

// 음성 프리셋 목록 (깊이 1). 기본 지정·변경 (TTS_SYSTEM.md §1)

export default function PresetList() {
  const { t } = useTranslation();
  const presets = useLibrary((s) => s.presets);
  const defaultId = useLibrary((s) => s.defaultPresetId);
  const [noKorean, setNoKorean] = useState(false);

  // 한국어 목소리가 없으면 한국어 문장을 영어 목소리가 읽는다. 받는 곳을 안내한다 (TTS_SYSTEM.md §2)
  useEffect(() => {
    listVoices(null)
      .then((v) => setNoKorean(!v.some((x) => x.language === 'ko')))
      .catch(() => setNoKorean(false));
  }, []);

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('presets.title')} />
      <FlatList
        data={presets}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.top}>
            <Text style={styles.help}>{t('presets.help')}</Text>
            {noKorean ? (
              <View style={styles.warnBox}>
                <Text style={styles.warn}>{t('presets.noKorean')}</Text>
                <Button
                  label={t('presets.openTtsSettings')}
                  icon="settings-outline"
                  kind="secondary"
                  compact
                  onPress={() =>
                    Linking.sendIntent('com.android.settings.TTS_SETTINGS').catch(() => Linking.openSettings())
                  }
                />
              </View>
            ) : null}
            <Button label={t('presets.add')} icon="add" onPress={() => router.push('/preset/edit')} />
          </View>
        }
        renderItem={({ item }) => {
          const isDefault = item.id === defaultId;
          return (
            <View style={[styles.card, isDefault && styles.cardDefault]}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{item.name}</Text>
                {isDefault ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t('presets.default')}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.sub}>
                {t('presets.summary', { rate: item.rate.toFixed(1), pitch: item.pitch.toFixed(1) })}
              </Text>
              <View style={styles.actions}>
                {isDefault ? null : (
                  <Button
                    label={t('presets.makeDefault')}
                    icon="star-outline"
                    kind="secondary"
                    compact
                    onPress={() => setDefaultPreset(item.id)}
                  />
                )}
                <Button
                  label={t('common.edit')}
                  icon="create-outline"
                  compact
                  onPress={() => router.push({ pathname: '/preset/edit', params: { id: item.id } })}
                />
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.xxl, gap: SPACE.md },
  top: { gap: SPACE.md, paddingTop: SPACE.lg, paddingBottom: SPACE.sm },
  help: { ...TYPE.sub, color: COLOR.textSub },
  warnBox: { backgroundColor: COLOR.dangerSoft, borderRadius: RADIUS, padding: SPACE.lg, gap: SPACE.md },
  warn: { ...TYPE.sub, color: COLOR.text },
  card: { borderRadius: RADIUS, borderWidth: 1, borderColor: COLOR.border, padding: SPACE.lg, gap: SPACE.sm },
  cardDefault: { borderColor: COLOR.primary },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  name: { ...TYPE.heading, color: COLOR.text, flexShrink: 1 },
  badge: { backgroundColor: COLOR.primary, borderRadius: 8, paddingHorizontal: SPACE.sm, paddingVertical: 2 },
  badgeText: { color: COLOR.primaryText, fontWeight: '700', fontSize: 14 },
  sub: { ...TYPE.sub, color: COLOR.textSub },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACE.sm },
});
