import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLOR, RADIUS, SPACE, TOUCH, TYPE } from '@/theme';

// 공통 부품. 깊이 1 이상 화면은 Header 의 뒤로가기를 쓴다 (common/UI_NAVIGATION.md · docs/UI_GUIDE.md §1)

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  edges = ['top'],
}: {
  children: ReactNode;
  edges?: ('top' | 'bottom')[];
}) {
  return (
    <SafeAreaView edges={edges} style={styles.screen}>
      {children}
    </SafeAreaView>
  );
}

/** 좌측 상단 뒤로가기 + 제목. 뒤가 비어 있으면 탭 뿌리로 간다 (UI_NAVIGATION.md §2-3) */
export function Header({ title, right }: { title: string; right?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        hitSlop={8}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
      >
        <Ionicons name="arrow-back" size={28} color={COLOR.text} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

/** 탭 화면(깊이 0) 제목 */
export function TabTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.tabTitleRow}>
      <Text style={styles.tabTitle}>{title}</Text>
      {right}
    </View>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  label,
  icon,
  onPress,
  kind = 'primary',
  disabled,
  style,
  compact,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const palette = BUTTON[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.bg, borderColor: palette.border },
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={compact ? 20 : 24} color={palette.fg} /> : null}
      <Text style={[styles.buttonLabel, compact && styles.buttonLabelCompact, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

const BUTTON: Record<ButtonKind, { bg: string; fg: string; border: string }> = {
  primary: { bg: COLOR.primary, fg: COLOR.primaryText, border: COLOR.primary },
  secondary: { bg: COLOR.surface, fg: COLOR.text, border: COLOR.border },
  danger: { bg: COLOR.dangerSoft, fg: COLOR.danger, border: COLOR.dangerSoft },
  ghost: { bg: 'transparent', fg: COLOR.primary, border: 'transparent' },
};

/** 아이콘만 있는 버튼은 플레이어 컨트롤에만 쓴다 (UI_GUIDE.md §3) */
export function IconButton({
  icon,
  label,
  onPress,
  size = 64,
  filled,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
  filled?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        filled && { backgroundColor: COLOR.primary },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={size * 0.5} color={filled ? COLOR.primaryText : COLOR.text} />
    </Pressable>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

/** 여러 값 중 하나 고르기 */
export function Segment<T extends string | number>({
  options,
  value,
  onChange,
  labelOf,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labelOf: (v: T) => string;
}) {
  return (
    <View style={styles.segment}>
      {options.map((opt) => {
        const on = opt === value;
        return (
          <Pressable
            key={String(opt)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(opt)}
            style={({ pressed }) => [styles.segmentItem, on && styles.segmentOn, pressed && styles.pressed]}
          >
            <Text style={[styles.segmentLabel, on && styles.segmentLabelOn]}>{labelOf(opt)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** − 값 + */
export function Stepper({
  value,
  label,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
}: {
  value: string;
  label: string;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <IconButton icon="remove" label={`${label} -`} size={TOUCH} onPress={onMinus} disabled={minusDisabled} />
      <Text style={styles.stepperValue}>{value}</Text>
      <IconButton icon="add" label={`${label} +`} size={TOUCH} onPress={onPlus} disabled={plusDisabled} />
    </View>
  );
}

/** 라디오 한 줄 */
export function OptionRow({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.optionRow, selected && styles.optionRowOn, pressed && styles.pressed]}
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={26}
        color={selected ? COLOR.primary : COLOR.textFaint}
      />
      <View style={styles.flex}>
        <Text style={styles.optionLabel}>{label}</Text>
        {sub ? <Text style={styles.optionSub}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

/** 광고 자리. SDK 없이 자리만 그린다 (CLAUDE.md 결정 #5 · UI_GUIDE.md §4) */
export function AdSlot() {
  const { t } = useTranslation();
  return (
    <View style={styles.adSlot} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={styles.adLabel}>{t('common.ad')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLOR.background },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH + SPACE.sm,
    paddingHorizontal: SPACE.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLOR.border,
  },
  backBtn: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...TYPE.heading, color: COLOR.text, flex: 1, marginLeft: SPACE.xs },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  tabTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.md,
  },
  tabTitle: { ...TYPE.title, color: COLOR.text },
  button: {
    minHeight: TOUCH,
    borderRadius: RADIUS,
    borderWidth: 1,
    paddingHorizontal: SPACE.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
  buttonCompact: { minHeight: 48, paddingHorizontal: SPACE.md },
  buttonLabel: { ...TYPE.button },
  buttonLabelCompact: { fontSize: 16 },
  iconButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR.surface },
  section: { paddingHorizontal: SPACE.xl, paddingVertical: SPACE.md, gap: SPACE.md },
  sectionTitle: { ...TYPE.heading, color: COLOR.text },
  empty: { padding: SPACE.xxl, alignItems: 'center' },
  emptyText: { ...TYPE.body, color: COLOR.textSub, textAlign: 'center' },
  segment: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  segmentItem: {
    minHeight: 48,
    minWidth: 64,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: COLOR.border,
    backgroundColor: COLOR.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { backgroundColor: COLOR.primary, borderColor: COLOR.primary },
  segmentLabel: { ...TYPE.button, fontSize: 16, color: COLOR.text },
  segmentLabelOn: { color: COLOR.primaryText },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg },
  stepperValue: { ...TYPE.heading, color: COLOR.text, minWidth: 72, textAlign: 'center' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    minHeight: TOUCH,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  optionRowOn: { borderColor: COLOR.primary, backgroundColor: COLOR.primarySoft },
  optionLabel: { ...TYPE.body, color: COLOR.text },
  optionSub: { ...TYPE.sub, color: COLOR.textSub },
  adSlot: {
    height: 50,
    backgroundColor: COLOR.adSlot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adLabel: { ...TYPE.caption, color: COLOR.textFaint },
});
