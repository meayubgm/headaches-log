import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { t } from '@/lib/i18n';

export default function TabsLayout() {
  const scheme = useColorScheme();
  // useColorScheme() は null / 'unspecified' を返しうるので light に正規化する
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // タブバーの色は className で指定できないためトークンから JS 側で解決する
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="house" solid size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.calendar'),
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="calendar-days" solid size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
