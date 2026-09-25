import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, Screen, TabTitle } from '@/components/ui';
import { useLibrary, type Sentence } from '@/features/library';
import { playEntries, usePlayer } from '@/features/player';
import { COLOR, RADIUS, SPACE, TYPE } from '@/theme';

// 문장 탭 (깊이 0). [듣기] = 그 문장 하나, [전체 듣기] = 내 문장 전체 (PLAYER_SYSTEM.md §1)

export default function SentencesTab() {
  const { t } = useTranslation();
  const sentences = useLibrary((s) => s.sentences);
  const presets = useLibrary((s) => s.presets);
  const playingId = usePlayer((s) => (s.native?.queueLength ? s.native.itemId : null));

  const presetName = (id: string | null) => (id ? presets.find((p) => p.id === id)?.name : undefined);

  const playOne = (s: Sentence) =>
    playEntries([{ itemId: s.id, sentence: s }], 0, t('player.oneSentence'));
  const playAll = () =>
    playEntries(
      sentences.map((s) => ({ itemId: s.id, sentence: s })),
      0,
      t('player.allSentences'),
    );

  return (
    <Screen>
      <TabTitle title={t('sentences.title')} />
      <View style={styles.actions}>
        <Button
          label={t('sentences.add')}
          icon="add"
          onPress={() => router.push('/sentence/edit')}
          style={styles.flex}
        />
        <Button
          label={t('sentences.playAll')}
          icon="play"
          kind="secondary"
          onPress={playAll}
          disabled={sentences.length === 0}
          style={styles.flex}
        />
      </View>
      <FlatList
        data={sentences}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState text={t('sentences.empty')} />}
        renderItem={({ item }) => {
          const name = presetName(item.presetId);
          const active = item.id === playingId;
          return (
            <View style={[styles.card, active && styles.cardActive]}>
              <Text style={styles.text}>{item.text}</Text>
              {name ? <Text style={styles.tag}>{t('sentences.voiceTag', { name })}</Text> : null}
              <View style={styles.cardActions}>
                <Button label={t('common.listen')} icon="play" compact onPress={() => playOne(item)} />
                <Button
                  label={t('common.edit')}
                  icon="create-outline"
                  kind="secondary"
                  compact
                  onPress={() => router.push({ pathname: '/sentence/edit', params: { id: item.id } })}
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
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: SPACE.md, paddingHorizontal: SPACE.xl, paddingBottom: SPACE.md },
  list: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.xxl, gap: SPACE.md },
  card: {
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: COLOR.border,
    padding: SPACE.lg,
    gap: SPACE.sm,
    backgroundColor: COLOR.background,
  },
  cardActive: { backgroundColor: COLOR.primarySoft, borderColor: COLOR.primary, borderLeftWidth: 6 },
  text: { ...TYPE.sentence, color: COLOR.text },
  tag: { ...TYPE.sub, color: COLOR.textSub },
  cardActions: { flexDirection: 'row', gap: SPACE.sm, justifyContent: 'flex-end' },
});
