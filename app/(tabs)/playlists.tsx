import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { NameDialog } from '@/components/name-dialog';
import { Button, EmptyState, Screen, TabTitle } from '@/components/ui';
import { createPlaylist, useLibrary } from '@/features/library';
import { COLOR, RADIUS, SPACE, TOUCH, TYPE } from '@/theme';

// 재생목록 탭 (깊이 0)

export default function PlaylistsTab() {
  const { t } = useTranslation();
  const playlists = useLibrary((s) => s.playlists);
  const [creating, setCreating] = useState(false);

  return (
    <Screen>
      <TabTitle title={t('playlists.title')} />
      <View style={styles.actions}>
        <Button label={t('playlists.add')} icon="add" onPress={() => setCreating(true)} />
      </View>
      <FlatList
        data={playlists}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState text={t('playlists.empty')} />}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Ionicons name="musical-notes" size={28} color={COLOR.primary} />
            <View style={styles.flex}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.count}>{t('playlists.count', { n: item.count })}</Text>
            </View>
            <Ionicons name="chevron-forward" size={26} color={COLOR.textFaint} />
          </Pressable>
        )}
      />
      <NameDialog
        visible={creating}
        title={t('playlists.nameTitle')}
        placeholder={t('playlists.namePlaceholder')}
        onCancel={() => setCreating(false)}
        onSubmit={(name) => {
          setCreating(false);
          const id = createPlaylist(name);
          router.push({ pathname: '/playlist/[id]', params: { id } });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  actions: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.md },
  list: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.xxl, gap: SPACE.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    minHeight: TOUCH + SPACE.lg,
    padding: SPACE.lg,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  name: { ...TYPE.heading, color: COLOR.text },
  count: { ...TYPE.sub, color: COLOR.textSub },
});
