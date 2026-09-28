import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, Header, Screen } from '@/components/ui';
import { addToPlaylist, getPlaylistItems, useLibrary } from '@/features/library';
import { COLOR, RADIUS, SPACE, TOUCH, TYPE } from '@/theme';

// 재생목록에 문장 넣기 (깊이 2). 체크박스 켜기/끄기 · 이미 든 문장은 안 보인다 (CLAUDE.md 결정 #18)
// 넣는 순서는 목록에 보이는 순서다(고른 순서가 아니다)

export default function PickSentences() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sentences = useLibrary((s) => s.sentences);
  const playlist = useLibrary((s) => s.playlists.find((p) => p.id === id));
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // 이미 이 재생목록에 든 문장은 고를 수 없게 아예 뺀다
  const candidates = useMemo(() => {
    if (!playlist) return [];
    const inside = new Set(getPlaylistItems(playlist.id).map((it) => it.sentenceId));
    return sentences.filter((s) => !inside.has(s.id));
  }, [playlist, sentences]);

  const toggle = (sid: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });

  const count = picked.size;
  const empty = sentences.length === 0 ? t('pick.empty') : t('pick.allIn');

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('pick.title')} />
      <FlatList
        data={candidates}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState text={empty} />}
        renderItem={({ item }) => {
          const on = picked.has(item.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(item.id)}
              style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
            >
              <Ionicons
                name={on ? 'checkbox' : 'square-outline'}
                size={32}
                color={on ? COLOR.primary : COLOR.textFaint}
              />
              <Text style={styles.text}>{item.text}</Text>
            </Pressable>
          );
        }}
      />
      <View style={styles.bottom}>
        <Button
          label={count ? t('pick.add', { n: count }) : t('pick.none')}
          icon="checkmark"
          disabled={count === 0}
          onPress={() => {
            addToPlaylist(
              id,
              candidates.filter((s) => picked.has(s.id)).map((s) => s.id),
            );
            router.back();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  list: { padding: SPACE.xl, gap: SPACE.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    minHeight: TOUCH,
    padding: SPACE.lg,
    borderRadius: RADIUS,
    borderWidth: 1.5,
    borderColor: COLOR.cardBorder,
  },
  rowOn: { borderColor: COLOR.primary, backgroundColor: COLOR.primarySoft },
  text: { ...TYPE.sentence, color: COLOR.text, flex: 1 },
  bottom: { padding: SPACE.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLOR.border },
});
