import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Header, OptionRow, Screen, Section } from '@/components/ui';
import {
  countPlaylistsContaining,
  createSentence,
  deleteSentence,
  MAX_SENTENCE_LENGTH,
  resolvePreset,
  updateSentence,
  useLibrary,
} from '@/features/library';
import { previewPreset } from '@/features/player';
import { COLOR, RADIUS, SPACE, TYPE } from '@/theme';

// 문장 추가·수정 (깊이 1). 필요한 입력은 본문 하나다 (CLAUDE.md 기둥 1)

export default function SentenceEdit() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useLibrary((s) => (id ? s.sentences.find((x) => x.id === id) : undefined));
  const presets = useLibrary((s) => s.presets);
  const defaultPresetId = useLibrary((s) => s.defaultPresetId);
  const [text, setText] = useState(existing?.text ?? '');
  const [presetId, setPresetId] = useState<string | null>(existing?.presetId ?? null);

  const trimmed = text.trim();
  const defaultName = presets.find((p) => p.id === defaultPresetId)?.name ?? '';

  const save = () => {
    if (!trimmed) {
      Alert.alert(t('sentenceEdit.emptyText'));
      return;
    }
    if (existing) updateSentence(existing.id, trimmed, presetId);
    else createSentence(trimmed, presetId);
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const n = countPlaylistsContaining(existing.id);
    Alert.alert(
      t('sentenceEdit.deleteTitle'),
      n > 0 ? t('sentenceEdit.deleteBodyInPlaylists', { n }) : t('sentenceEdit.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteSentence(existing.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={existing ? t('sentenceEdit.editTitle') : t('sentenceEdit.newTitle')} />
      <KeyboardAvoidingView behavior="height" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.inputBox}>
            <View style={styles.inputFrame}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t('sentenceEdit.placeholder')}
                placeholderTextColor={COLOR.textFaint}
                multiline
                maxLength={MAX_SENTENCE_LENGTH}
                style={styles.input}
                textAlignVertical="top"
                autoFocus={!existing}
                underlineColorAndroid="transparent"
              />
            </View>
            <Text style={styles.counter}>
              {t('sentenceEdit.counter', { n: text.length, max: MAX_SENTENCE_LENGTH })}
            </Text>
          </View>

          <Section title={t('sentenceEdit.voice')}>
            <OptionRow
              label={t('sentenceEdit.voiceDefault')}
              sub={t('sentenceEdit.voiceDefaultSub', { name: defaultName })}
              selected={presetId === null}
              onPress={() => setPresetId(null)}
            />
            {presets.map((p) => (
              <OptionRow key={p.id} label={p.name} selected={presetId === p.id} onPress={() => setPresetId(p.id)} />
            ))}
          </Section>

          <View style={styles.buttons}>
            <Button
              label={t('sentenceEdit.preview')}
              icon="volume-high"
              kind="secondary"
              disabled={!trimmed}
              onPress={() => previewPreset(trimmed, resolvePreset(presetId), t('sentenceEdit.preview'))}
            />
            <Button label={t('common.save')} icon="checkmark" onPress={save} disabled={!trimmed} />
            {existing ? <Button label={t('common.delete')} icon="trash-outline" kind="danger" onPress={remove} /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingBottom: SPACE.xxl },
  inputBox: { paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg, gap: SPACE.xs },
  // 테두리·여백은 감싸는 View 가 맡는다. Android EditText 는 배경을 바꾸면 스타일 padding 이 무시돼서다
  inputFrame: {
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS,
    padding: SPACE.lg,
  },
  input: {
    ...TYPE.sentence,
    color: COLOR.text,
    backgroundColor: 'transparent',
    minHeight: 160,
    padding: 0,
  },
  counter: { ...TYPE.caption, color: COLOR.textFaint, alignSelf: 'flex-end' },
  buttons: { paddingHorizontal: SPACE.xl, gap: SPACE.md, paddingTop: SPACE.md },
});
