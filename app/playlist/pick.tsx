import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, Header, Screen } from '@/components/ui';
import { addToPlaylist, useLibrary } from '@/features/library';
import { COLOR, RADIUS, SPACE, TOUCH, TYPE } from '@/theme';

// 재생목록에 문장 넣기 (깊이 2). 고른 순서대로 끝에 붙는다

export default function PickSentences() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sentences = useLibrary((s) => s.sentences);
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (sid: string) =>
    setPicked((cur) => (cur.includes(sid) ? cur.filter((x) => x !== sid) : [...cur, sid]));

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('pick.title')} />
      <FlatList
        data={sentences}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState text={t('pick.empty')} />}
        renderItem={({ item }) => {
          const order = picked.indexOf(item.id);
          const on = order >= 0;
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(item.id)}
              style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && styles.pressed]}
            >
              {on ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{order + 1}</Text>
                </View>
              ) : (
                <Ionicons name="square-outline" size={30} color={COLOR.textFaint} />
              )}
              <Text style={styles.text}>{item.text}</Text>
            </Pressable>
          );
        }}
      />
      <View style={styles.bottom}>
        <Button
          label={picked.length ? t('pick.add', { n: picked.length }) : t('pick.none')}
          icon="checkmark"
          disabled={picked.length === 0}
          onPress={() => {
            addToPlaylist(id, picked);
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
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  rowOn: { borderColor: COLOR.primary, backgroundColor: COLOR.primarySoft },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLOR.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: COLOR.primaryText, fontWeight: '700', fontSize: 16 },
  text: { ...TYPE.sentence, color: COLOR.text, flex: 1 },
  bottom: { padding: SPACE.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLOR.border },
});
