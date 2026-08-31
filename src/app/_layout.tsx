import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { SplashGate } from '@/components/splash-gate';
import { t } from '@/lib/i18n';

import '@/global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SplashGate>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* headerBackTitle を指定しないと、iOS の戻るボタンにルートグループ名の「(tabs)」が出る */}
          <Stack.Screen
            name="headaches/new"
            options={{ title: t('navigation.newHeadache'), headerBackTitle: t('navigation.back') }}
          />
          <Stack.Screen
            name="headaches/[id]"
            options={{ title: t('navigation.headacheDetail'), headerBackTitle: t('navigation.back') }}
          />
          <Stack.Screen
            name="settings/tags"
            options={{ title: t('navigation.tagSettings'), headerBackTitle: t('navigation.back') }}
          />
        </Stack>
      </SplashGate>
    </ThemeProvider>
  );
}
