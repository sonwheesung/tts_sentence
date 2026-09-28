import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/mini-player';
import { AdSlot } from '@/components/ui';
import { SHOW_AD_SLOT } from '@/features/flags';
import { COLOR, SPACE } from '@/theme';

// 뿌리 탭 3개 + 광고 자리 + 미니 플레이어 (CLAUDE.md §10 · UI_GUIDE.md §4)
// 순서: 화면 → 광고 자리 → (간격) → 미니 플레이어 → 탭바. 광고가 재생 버튼에 붙지 않게 간격을 둔다
// 광고 자리는 지금 숨김이다(결정 #17)

/** 탭바 본체 높이. 시니어용으로 기본보다 크게 잡는다(UI_GUIDE.md §2) */
const TAB_BAR_BODY = 64;

export default function TabsLayout() {
  const { t } = useTranslation();
  // 🔴 고정 height 만 주면 시스템 내비게이션 바 몫(insets.bottom)이 사라져 3버튼 폰에서 탭이 가린다(UI_GUIDE.md §3).
  //    그래서 본체 높이에 insets.bottom 을 더하고 그만큼 아래를 비운다
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLOR.primary,
        tabBarInactiveTintColor: COLOR.textFaint,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          height: TAB_BAR_BODY + insets.bottom,
          paddingTop: SPACE.xs,
          paddingBottom: insets.bottom + SPACE.xs,
        },
      }}
      tabBar={(props) => (
        <View>
          {SHOW_AD_SLOT ? (
            <>
              <AdSlot />
              <View style={styles.gap} />
            </>
          ) : null}
          <MiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.sentences'),
          tabBarIcon: ({ color }) => <Ionicons name="document-text" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="playlists"
        options={{
          title: t('tabs.playlists'),
          tabBarIcon: ({ color }) => <Ionicons name="list" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: '700' },
  gap: { height: SPACE.sm, backgroundColor: COLOR.background },
});
