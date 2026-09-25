import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { RepeatOption, ShuffleOption, SpeedOption } from '@/components/playback-options';
import { Button, Header, IconButton, OptionRow, Screen } from '@/components/ui';
import { currentEntry, playerControls, usePlayer } from '@/features/player';
import { COLOR, RADIUS, SPACE, TYPE } from '@/theme';

// 재생 화면 (깊이 1). 지금 문장을 크게 보여 주고 목록에서 강조한다 (결정 #11)

const SLEEP_MINUTES = [10, 20, 30, 60] as const;

function hhmm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const { t } = useTranslation();
  const native = usePlayer((s) => s.native);
  const queue = usePlayer((s) => s.queue);
  const sourceName = usePlayer((s) => s.sourceName);
  const preparing = usePlayer((s) => s.preparing);
  const error = usePlayer((s) => s.error);
  const entry = usePlayer(currentEntry);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  const isPlaying = native?.isPlaying ?? false;
  const hasQueue = (native?.queueLength ?? 0) > 0;
  const idx = entry ? queue.indexOf(entry) : -1;

  useEffect(() => {
    if (idx >= 0) listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.3, animated: true });
  }, [idx]);

  const loopText =
    native && hasQueue
      ? native.repeat === 0
        ? t('player.loopInfinite', { i: native.loop + 1 })
        : t('player.loop', { i: Math.min(native.loop + 1, native.repeat), n: native.repeat })
      : '';

  const sleepText = native?.sleepEndOfLoop
    ? t('player.sleepLoopOn')
    : native?.sleepAt
      ? t('player.sleepAt', { time: hhmm(native.sleepAt) })
      : null;

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={sourceName || t('player.title')} />

      <View style={styles.now}>
        {preparing && !isPlaying && !entry ? (
          <View style={styles.preparing}>
            <ActivityIndicator color={COLOR.primary} size="large" />
            <Text style={styles.sub}>{t('player.preparing')}</Text>
          </View>
        ) : (
          <Text style={styles.nowText} numberOfLines={6} adjustsFontSizeToFit minimumFontScale={0.7}>
            {entry?.sentence.text ?? t('player.nothing')}
          </Text>
        )}
        <Text style={styles.sub}>
          {idx >= 0 ? t('player.position', { i: idx + 1, n: queue.length }) : ''}
          {loopText ? `   ${loopText}` : ''}
        </Text>
        {native?.ended ? <Text style={styles.ended}>{t('player.ended')}</Text> : null}
        {error === 'synth' ? <Text style={styles.error}>{t('player.errorSynth')}</Text> : null}
        {error === 'partial' ? <Text style={styles.error}>{t('player.errorPartial')}</Text> : null}
        {sleepText ? <Text style={styles.sleep}>{sleepText}</Text> : null}
      </View>

      <View style={styles.controls}>
        <IconButton
          icon="play-skip-back"
          label={t('player.previous')}
          size={72}
          disabled={!hasQueue}
          onPress={() => playerControls.previous()}
        />
        <IconButton
          icon={isPlaying ? 'pause' : 'play'}
          label={isPlaying ? t('player.pause') : t('player.play')}
          size={96}
          filled
          disabled={!hasQueue}
          onPress={() => (isPlaying ? playerControls.pause() : playerControls.play())}
        />
        <IconButton
          icon="play-skip-forward"
          label={t('player.next')}
          size={72}
          disabled={!hasQueue}
          onPress={() => playerControls.next()}
        />
      </View>

      <View style={styles.optionRow}>
        <Button
          label={t('settings.repeat')}
          icon="repeat"
          kind="secondary"
          compact
          style={styles.flex}
          onPress={() => setOptionsOpen(true)}
        />
        <Button
          label={t('player.sleep')}
          icon="moon-outline"
          kind="secondary"
          compact
          style={styles.flex}
          onPress={() => setSleepOpen(true)}
        />
      </View>

      <Text style={styles.queueTitle}>{t('player.queue')}</Text>
      <FlatList
        ref={listRef}
        data={queue}
        keyExtractor={(e) => e.itemId}
        contentContainerStyle={styles.list}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item, index }) => {
          const active = item === entry;
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => playerControls.seekToItem(item.itemId)}
              style={({ pressed }) => [styles.qRow, active && styles.qRowActive, pressed && styles.pressed]}
            >
              <Text style={styles.qNum}>{index + 1}</Text>
              <Text style={[styles.qText, active && styles.qTextActive]} numberOfLines={2}>
                {item.sentence.text}
              </Text>
            </Pressable>
          );
        }}
      />

      <Modal visible={sleepOpen} transparent animationType="fade" onRequestClose={() => setSleepOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSleepOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('player.sleep')}</Text>
            <OptionRow
              label={t('player.sleepOff')}
              selected={!native?.sleepAt && !native?.sleepEndOfLoop}
              onPress={() => {
                void playerControls.setSleepTimer(0, false);
                setSleepOpen(false);
              }}
            />
            {SLEEP_MINUTES.map((m) => (
              <OptionRow
                key={m}
                label={t('player.sleepMinutes', { m })}
                selected={false}
                onPress={() => {
                  void playerControls.setSleepTimer(m * 60 * 1000, false);
                  setSleepOpen(false);
                }}
              />
            ))}
            <OptionRow
              label={t('player.sleepEndOfLoop')}
              selected={!!native?.sleepEndOfLoop}
              onPress={() => {
                void playerControls.setSleepTimer(0, true);
                setSleepOpen(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={optionsOpen} transparent animationType="fade" onRequestClose={() => setOptionsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOptionsOpen(false)}>
          <Pressable style={[styles.sheet, styles.sheetWide]}>
            <RepeatOption />
            <SpeedOption />
            <ShuffleOption />
            <Button label={t('common.confirm')} onPress={() => setOptionsOpen(false)} style={styles.sheetButton} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  now: { paddingHorizontal: SPACE.xl, paddingTop: SPACE.xl, gap: SPACE.sm, minHeight: 200 },
  preparing: { alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.xl },
  nowText: { fontSize: 26, lineHeight: 38, fontWeight: '600', color: COLOR.text },
  sub: { ...TYPE.sub, color: COLOR.textSub },
  ended: { ...TYPE.body, color: COLOR.primary, fontWeight: '700' },
  error: { ...TYPE.sub, color: COLOR.danger },
  sleep: { ...TYPE.sub, color: COLOR.primary },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACE.xxl,
    paddingVertical: SPACE.lg,
  },
  optionRow: { flexDirection: 'row', gap: SPACE.md, paddingHorizontal: SPACE.xl },
  queueTitle: { ...TYPE.heading, color: COLOR.text, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
  list: { padding: SPACE.xl, gap: SPACE.sm },
  qRow: {
    flexDirection: 'row',
    gap: SPACE.md,
    padding: SPACE.md,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: COLOR.border,
    minHeight: 56,
    alignItems: 'center',
  },
  qRowActive: { backgroundColor: COLOR.primarySoft, borderColor: COLOR.primary, borderLeftWidth: 6 },
  qNum: { ...TYPE.sub, color: COLOR.textFaint, minWidth: 24 },
  qText: { ...TYPE.body, color: COLOR.text, flex: 1 },
  qTextActive: { fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: SPACE.xl },
  sheet: { backgroundColor: COLOR.background, borderRadius: RADIUS, padding: SPACE.xl, gap: SPACE.sm },
  sheetWide: { paddingHorizontal: 0 },
  sheetTitle: { ...TYPE.heading, color: COLOR.text, paddingBottom: SPACE.sm },
  sheetButton: { marginHorizontal: SPACE.xl },
});
