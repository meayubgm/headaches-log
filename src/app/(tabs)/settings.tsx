import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { t } from '@/lib/i18n';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="w-full max-w-[800px] self-center gap-four p-four">
          <Text className="text-2xl font-bold text-fg dark:text-fg-dark">{t('settings.title')}</Text>

          <Pressable
            onPress={() => router.push({ pathname: '/settings/tags' })}
            accessibilityRole="button"
            accessibilityLabel={t('settings.tags')}
            className="min-h-[64px] flex-row items-center gap-three rounded-2xl bg-surface p-four dark:bg-surface-dark">
            <View className="flex-1 gap-half">
              <Text className="text-base font-bold text-fg dark:text-fg-dark">
                {t('settings.tags')}
              </Text>
              <Text className="text-sm text-fg-muted dark:text-fg-muted-dark">
                {t('settings.tagsDescription')}
              </Text>
            </View>
            {/* アイコンの色は className で指定できないためトークンから JS 側で解決する */}
            <FontAwesome6 name="chevron-right" solid size={14} color={colors.textSecondary} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
