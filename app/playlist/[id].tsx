import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { MiniPlayer } from '@/components/mini-player';
import { NameDialog } from '@/components/name-dialog';
import { Button, EmptyState, Header, IconButton, Screen } from '@/components/ui';
import {
  deletePlaylist,
  getPlaylistItems,
  moveInPlaylist,
  removeFromPlaylist,
  renamePlaylist,
  useLibrary,
} from '@/features/library';
import { playEntries, usePlayer, type QueueEntry } from '@/features/player';
import { COLOR, RADIUS, SPACE, TOUCH, TYPE } from '@/theme';

// 재생목록 상세 (깊이 1). 순서 바꾸기는 위/아래 버튼 (UI_GUIDE.md §3: 길게 누르기 금지)

export default function PlaylistDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const playlist = useLibrary((s) => s.playlists.find((p) => p.id === id));
  const sentences = useLibrary((s) => s.sentences);
  const playingId = usePlayer((s) => (s.native?.queueLength ? s.native.itemId : null));
  const [renaming, setRenaming] = useState(false);

  // playlists 가 바뀌면(updated_at) 다시 읽는다
  const entries = useMemo<QueueEntry[]>(() => {
    if (!playlist) return [];
    const byId = new Map(sentences.map((s) => [s.id, s]));
    return getPlaylistItems(playlist.id).flatMap((it) => {
      const sentence = byId.get(it.sentenceId);
      return sentence ? [{ itemId: it.id, sentence }] : [];
    });
  }, [playlist, sentences]);

  if (!playlist) {
    return (
      <Screen>
        <Header title="" />
      </Screen>
    );
  }

  const remove = () =>
    Alert.alert(t('playlist.deleteTitle'), t('playlist.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deletePlaylist(playlist.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={playlist.name} />
      <FlatList
        data={entries}
        keyExtractor={(e) => e.itemId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.top}>
            <Button
              label={t('playlist.play')}
              icon="play"
              disabled={entries.length === 0}
              onPress={() => playEntries(entries, 0, playlist.name)}
            />
            <View style={styles.row}>
              <Button
                label={t('playlist.addSentences')}
                icon="add"
                kind="secondary"
                style={styles.flex}
                onPress={() => router.push({ pathname: '/playlist/pick', params: { id: playlist.id } })}
              />
              <Button
                label={t('playlist.rename')}
                icon="create-outline"
                kind="secondary"
                style={styles.flex}
                onPress={() => setRenaming(true)}
              />
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState text={t('playlist.empty')} />}
        ListFooterComponent={
          <View style={styles.footer}>
            <Button label={t('common.delete')} icon="trash-outline" kind="danger" onPress={remove} />
          </View>
        }
        renderItem={({ item, index }) => {
          const active = item.itemId === playingId;
          return (
            <View style={[styles.card, active && styles.cardActive]}>
              <View style={styles.cardTop}>
                <Text style={styles.num}>{index + 1}</Text>
                <Text style={[styles.text, styles.flex]}>{item.sentence.text}</Text>
              </View>
              <View style={styles.cardActions}>
                <Button
                  label={t('playlist.listenFromHere')}
                  icon="play"
                  compact
                  onPress={() => playEntries(entries, index, playlist.name)}
                />
                <View style={styles.flex} />
                <IconButton
                  icon="arrow-up"
                  label={t('playlist.moveUp')}
                  size={48}
                  disabled={index === 0}
                  onPress={() => moveInPlaylist(playlist.id, item.itemId, -1)}
                />
                <IconButton
                  icon="arrow-down"
                  label={t('playlist.moveDown')}
                  size={48}
                  disabled={index === entries.length - 1}
                  onPress={() => moveInPlaylist(playlist.id, item.itemId, 1)}
                />
                <Button
                  label={t('playlist.remove')}
                  kind="danger"
                  compact
                  onPress={() => removeFromPlaylist(playlist.id, item.itemId)}
                />
              </View>
            </View>
          );
        }}
      />
      <MiniPlayer />
      <NameDialog
        visible={renaming}
        title={t('playlists.renameTitle')}
        initial={playlist.name}
        onCancel={() => setRenaming(false)}
        onSubmit={(name) => {
          setRenaming(false);
          renamePlaylist(playlist.id, name);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.xxl, gap: SPACE.md },
  top: { gap: SPACE.md, paddingTop: SPACE.lg, paddingBottom: SPACE.sm },
  row: { flexDirection: 'row', gap: SPACE.md },
  footer: { paddingTop: SPACE.xxl },
  card: {
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: COLOR.border,
    padding: SPACE.lg,
    gap: SPACE.md,
  },
  cardActive: { backgroundColor: COLOR.primarySoft, borderColor: COLOR.primary, borderLeftWidth: 6 },
  cardTop: { flexDirection: 'row', gap: SPACE.md },
  num: { ...TYPE.heading, color: COLOR.textFaint, minWidth: 28 },
  text: { ...TYPE.sentence, color: COLOR.text },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: TOUCH },
});
