import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MiniPlayer } from '@/components/mini-player';
import { AdSlot } from '@/components/ui';
import { COLOR, SPACE } from '@/theme';

// 뿌리 탭 3개 + 광고 자리 + 미니 플레이어 (CLAUDE.md §10 · UI_GUIDE.md §4)
// 순서: 화면 → 광고 자리 → (간격) → 미니 플레이어 → 탭바. 광고가 재생 버튼에 붙지 않게 간격을 둔다

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLOR.primary,
        tabBarInactiveTintColor: COLOR.textFaint,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
      }}
      tabBar={(props) => (
        <View>
          <AdSlot />
          <View style={styles.gap} />
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
  tabBar: { height: 72, paddingTop: SPACE.xs },
  label: { fontSize: 15, fontWeight: '700' },
  gap: { height: SPACE.sm, backgroundColor: COLOR.background },
});
