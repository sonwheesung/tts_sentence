import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui';
import { currentEntry, playerControls, usePlayer } from '@/features/player';
import { COLOR, SPACE, TYPE } from '@/theme';

// 탭 위에 떠 있는 미니 플레이어 (CLAUDE.md 기둥 5). 누르면 재생 화면으로 간다.

export function MiniPlayer() {
  const { t } = useTranslation();
  const native = usePlayer((s) => s.native);
  const preparing = usePlayer((s) => s.preparing);
  const entry = usePlayer(currentEntry);
  const queueLength = usePlayer((s) => s.queue.length);

  if (queueLength === 0 && !preparing) return null;
  const isPlaying = native?.isPlaying ?? false;
  const text = entry?.sentence.text ?? (preparing ? t('player.preparing') : t('player.nothing'));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('player.title')}
      onPress={() => router.push('/player')}
      style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
    >
      <View style={styles.textBox}>
        <Text style={styles.text} numberOfLines={2}>
          {text}
        </Text>
      </View>
      {preparing && !isPlaying ? <ActivityIndicator color={COLOR.primary} /> : null}
      <IconButton
        icon={isPlaying ? 'pause' : 'play'}
        label={isPlaying ? t('player.pause') : t('player.play')}
        size={56}
        filled
        onPress={() => (isPlaying ? playerControls.pause() : playerControls.play())}
        disabled={(native?.queueLength ?? 0) === 0}
      />
      <IconButton
        icon="play-skip-forward"
        label={t('player.next')}
        size={56}
        onPress={() => playerControls.next()}
        disabled={(native?.queueLength ?? 0) < 2}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    backgroundColor: COLOR.primarySoft,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLOR.border,
  },
  pressed: { opacity: 0.8 },
  textBox: { flex: 1 },
  text: { ...TYPE.body, color: COLOR.text },
});
