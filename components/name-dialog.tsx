import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui';
import { COLOR, RADIUS, SPACE, TYPE } from '@/theme';

// 이름 한 줄 입력. Alert.prompt 는 iOS 전용이라 직접 그린다.

export function NameDialog({
  visible,
  title,
  initial = '',
  placeholder,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  initial?: string;
  placeholder?: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const [lastVisible, setLastVisible] = useState(visible);
  // 열릴 때마다 초깃값으로 되돌린다
  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) setValue(initial);
  }
  const trimmed = value.trim();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={COLOR.textFaint}
            style={styles.input}
            maxLength={30}
            underlineColorAndroid="transparent"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => trimmed && onSubmit(trimmed)}
          />
          <View style={styles.row}>
            <Button label={t('common.cancel')} kind="secondary" onPress={onCancel} style={styles.flex} />
            <Button
              label={t('common.save')}
              onPress={() => onSubmit(trimmed)}
              disabled={!trimmed}
              style={styles.flex}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: SPACE.xl },
  card: { backgroundColor: COLOR.background, borderRadius: RADIUS, padding: SPACE.xl, gap: SPACE.lg },
  title: { ...TYPE.heading, color: COLOR.text },
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
  row: { flexDirection: 'row', gap: SPACE.md },
  flex: { flex: 1 },
});
