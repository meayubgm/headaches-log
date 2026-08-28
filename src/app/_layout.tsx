import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { SplashGate } from '@/components/splash-gate';

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
            options={{ title: '記録を追加', headerBackTitle: '戻る' }}
          />
          <Stack.Screen
            name="headaches/[id]"
            options={{ title: '記録の詳細', headerBackTitle: '戻る' }}
          />
        </Stack>
      </SplashGate>
    </ThemeProvider>
  );
}
