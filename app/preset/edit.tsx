import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Header, OptionRow, Screen, Section, Stepper } from '@/components/ui';
import { createPreset, deletePreset, updatePreset, useLibrary, type Preset } from '@/features/library';
import { previewPreset } from '@/features/player';
import { listEngines, listVoices } from '@/features/tts';
import type { TtsEngine, TtsVoice } from '@/modules/sentence-audio';
import { COLOR, RADIUS, SPACE, TYPE } from '@/theme';

// 음성 프리셋 편집 (깊이 2): 엔진 + 목소리 + 빠르기 + 높낮이 (TTS_SYSTEM.md §1·§2)

const LANG_NAMES: Record<string, string> = {
  ko: '한국어',
  en: '영어',
  ja: '일본어',
  zh: '중국어',
  es: '스페인어',
  fr: '프랑스어',
  de: '독일어',
};

const STEP = 0.1;
const MIN = 0.5;
const MAX = 2.0;
const round1 = (v: number) => Math.round(v * 10) / 10;

export default function PresetEdit() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useLibrary((s) => (id ? s.presets.find((p) => p.id === id) : undefined));
  const defaultId = useLibrary((s) => s.defaultPresetId);

  const [name, setName] = useState(existing?.name ?? '');
  const [engine, setEngine] = useState<string | null>(existing?.engine ?? null);
  const [voice, setVoice] = useState<string | null>(existing?.voice ?? null);
  const [rate, setRate] = useState(existing?.rate ?? 1);
  const [pitch, setPitch] = useState(existing?.pitch ?? 1);

  const [engines, setEngines] = useState<TtsEngine[]>([]);
  const [voices, setVoices] = useState<TtsVoice[] | null>(null);
  const [voicesFailed, setVoicesFailed] = useState(false);

  useEffect(() => {
    listEngines()
      .then((r) => setEngines(r.engines))
      .catch(() => setEngines([]));
  }, []);

  useEffect(() => {
    let alive = true;
    setVoices(null);
    setVoicesFailed(false);
    listVoices(engine)
      .then((v) => alive && setVoices(v))
      .catch(() => {
        if (alive) {
          setVoices([]);
          setVoicesFailed(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [engine]);

  const draft = (): Preset => ({
    id: existing?.id ?? '',
    name: name.trim(),
    engine,
    voice,
    rate: round1(rate),
    pitch: round1(pitch),
  });

  const voiceMissing = voice !== null && voices !== null && !voicesFailed && !voices.some((v) => v.name === voice);

  // 목소리 이름은 기계 이름이라 "한국어 목소리 3" 처럼 보여 준다 (TTS_SYSTEM.md §2)
  const counters: Record<string, number> = {};
  const labeled = (voices ?? []).map((v) => {
    counters[v.language] = (counters[v.language] ?? 0) + 1;
    const lang = LANG_NAMES[v.language] ?? v.locale;
    return { voice: v, label: t('presetEdit.voiceLabel', { lang, n: counters[v.language] }), sub: v.locale };
  });

  const save = () => {
    const p = draft();
    if (!p.name) {
      Alert.alert(t('presetEdit.emptyName'));
      return;
    }
    if (existing) updatePreset(p);
    else createPreset(p);
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    if (existing.id === defaultId) {
      Alert.alert(t('presetEdit.cantDelete'));
      return;
    }
    Alert.alert(t('presetEdit.deleteTitle'), t('presetEdit.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deletePreset(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={existing ? t('presetEdit.editTitle') : t('presetEdit.newTitle')} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Section title={t('presetEdit.name')}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('presetEdit.namePlaceholder')}
            placeholderTextColor={COLOR.textFaint}
            maxLength={30}
            underlineColorAndroid="transparent"
            style={styles.input}
          />
        </Section>

        <Section title={t('presetEdit.rate')}>
          <Stepper
            label={t('presetEdit.rate')}
            value={rate.toFixed(1)}
            onMinus={() => setRate((v) => Math.max(MIN, round1(v - STEP)))}
            onPlus={() => setRate((v) => Math.min(MAX, round1(v + STEP)))}
            minusDisabled={rate <= MIN}
            plusDisabled={rate >= MAX}
          />
        </Section>

        <Section title={t('presetEdit.pitch')}>
          <Stepper
            label={t('presetEdit.pitch')}
            value={pitch.toFixed(1)}
            onMinus={() => setPitch((v) => Math.max(MIN, round1(v - STEP)))}
            onPlus={() => setPitch((v) => Math.min(MAX, round1(v + STEP)))}
            minusDisabled={pitch <= MIN}
            plusDisabled={pitch >= MAX}
          />
        </Section>

        <View style={styles.previewBox}>
          <Button
            label={t('presetEdit.preview')}
            icon="volume-high"
            kind="secondary"
            onPress={() => previewPreset(t('presetEdit.previewText'), draft(), t('presetEdit.preview'))}
          />
        </View>

        {engines.length > 1 ? (
          <Section title={t('presetEdit.engine')}>
            <OptionRow
              label={t('presetEdit.engineDefault')}
              selected={engine === null}
              onPress={() => {
                setEngine(null);
                setVoice(null);
              }}
            />
            {engines.map((e) => (
              <OptionRow
                key={e.name}
                label={e.label}
                selected={engine === e.name}
                onPress={() => {
                  setEngine(e.name);
                  setVoice(null);
                }}
              />
            ))}
          </Section>
        ) : null}

        <Section title={t('presetEdit.voice')}>
          {voiceMissing ? <Text style={styles.warn}>{t('presetEdit.voiceMissing')}</Text> : null}
          <OptionRow label={t('presetEdit.voiceDefault')} selected={voice === null} onPress={() => setVoice(null)} />
          {voices === null ? (
            <View style={styles.loading}>
              <ActivityIndicator color={COLOR.primary} />
              <Text style={styles.sub}>{t('presetEdit.voicesLoading')}</Text>
            </View>
          ) : null}
          {voicesFailed ? <Text style={styles.warn}>{t('presetEdit.voicesFailed')}</Text> : null}
          {labeled.map(({ voice: v, label, sub }) => (
            <OptionRow key={v.name} label={label} sub={sub} selected={voice === v.name} onPress={() => setVoice(v.name)} />
          ))}
        </Section>

        <View style={styles.buttons}>
          <Button label={t('common.save')} icon="checkmark" onPress={save} />
          {existing ? (
            <Button label={t('common.delete')} icon="trash-outline" kind="danger" onPress={remove} />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: SPACE.xxl, paddingTop: SPACE.sm },
  input: {
    ...TYPE.body,
    color: COLOR.text,
    backgroundColor: COLOR.background, // Android EditText 기본 밑줄 배경을 덮는다
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS,
    paddingHorizontal: SPACE.md,
    minHeight: 56,
  },
  previewBox: { paddingHorizontal: SPACE.xl, paddingVertical: SPACE.sm },
  loading: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, padding: SPACE.sm },
  sub: { ...TYPE.sub, color: COLOR.textSub },
  warn: { ...TYPE.sub, color: COLOR.danger },
  buttons: { paddingHorizontal: SPACE.xl, gap: SPACE.md, paddingTop: SPACE.lg },
});
