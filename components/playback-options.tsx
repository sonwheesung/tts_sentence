import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Section, Segment, Stepper } from '@/components/ui';
import { playerControls } from '@/features/player';
import {
  GAP_OPTIONS_MS,
  REPEAT_MAX,
  saveGap,
  saveRepeat,
  saveShuffle,
  saveSpeed,
  SPEED_OPTIONS,
  useSettings,
} from '@/features/settings';
import { COLOR, SPACE, TYPE } from '@/theme';

// 반복 · 셔플 · 빠르기 · 간격. 설정 탭과 재생 화면이 같이 쓴다.
// 반복·셔플·빠르기는 지금 도는 재생에도 바로 적용한다. 간격은 다음 재생부터 (파일에 들어가기 때문 · PLAYER_SYSTEM.md §3)

export function RepeatOption() {
  const { t } = useTranslation();
  const repeat = useSettings((s) => s.repeat);
  const infinite = repeat === 0;
  const set = (n: number) => {
    saveRepeat(n);
    void playerControls.setRepeat(n);
  };
  return (
    <Section title={t('settings.repeat')}>
      <Text style={styles.help}>{t('settings.repeatHelp')}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>{t('settings.repeatInfinite')}</Text>
        <Switch
          value={infinite}
          onValueChange={(on) => set(on ? 0 : 1)}
          trackColor={{ true: COLOR.primary, false: COLOR.surfaceStrong }}
          thumbColor={COLOR.background}
          accessibilityLabel={t('settings.repeatInfinite')}
          style={styles.switch}
        />
      </View>
      {infinite ? null : (
        <Stepper
          label={t('settings.repeat')}
          value={t('settings.repeatTimes', { n: repeat })}
          onMinus={() => set(Math.max(1, repeat - 1))}
          onPlus={() => set(Math.min(REPEAT_MAX, repeat + 1))}
          minusDisabled={repeat <= 1}
          plusDisabled={repeat >= REPEAT_MAX}
        />
      )}
    </Section>
  );
}

export function ShuffleOption() {
  const { t } = useTranslation();
  const shuffle = useSettings((s) => s.shuffle);
  return (
    <Section>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.title}>{t('settings.shuffle')}</Text>
          <Text style={styles.help}>{t('settings.shuffleHelp')}</Text>
        </View>
        <Switch
          value={shuffle}
          onValueChange={(on) => {
            saveShuffle(on);
            void playerControls.setShuffle(on);
          }}
          trackColor={{ true: COLOR.primary, false: COLOR.surfaceStrong }}
          thumbColor={COLOR.background}
          accessibilityLabel={t('settings.shuffle')}
          style={styles.switch}
        />
      </View>
    </Section>
  );
}

export function SpeedOption() {
  const { t } = useTranslation();
  const speed = useSettings((s) => s.speed);
  return (
    <Section title={t('settings.speed')}>
      <Segment
        options={SPEED_OPTIONS}
        value={speed as (typeof SPEED_OPTIONS)[number]}
        labelOf={(v) => `${v}x`}
        onChange={(v) => {
          saveSpeed(v);
          void playerControls.setSpeed(v);
        }}
      />
    </Section>
  );
}

export function GapOption() {
  const { t } = useTranslation();
  const gapMs = useSettings((s) => s.gapMs);
  return (
    <Section title={t('settings.gap')}>
      <Segment
        options={GAP_OPTIONS_MS}
        value={gapMs as (typeof GAP_OPTIONS_MS)[number]}
        labelOf={(v) => (v === 0 ? t('settings.gapNone') : t('settings.gapSeconds', { s: v / 1000 }))}
        onChange={saveGap}
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  title: { ...TYPE.heading, color: COLOR.text },
  label: { ...TYPE.body, color: COLOR.text },
  help: { ...TYPE.sub, color: COLOR.textSub },
  switch: { transform: [{ scale: 1.3 }] },
});
