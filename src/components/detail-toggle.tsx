import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, Text } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type DetailToggleProps = {
  open: boolean;
  onPress: () => void;
};

/**
 * 詳細入力パネルの開閉トグル。開閉は文言と、angle-down アイコンの回転で示す。
 * react-native-reanimated は babel プラグイン未設定のため、RN コアの Animated を使う。
 */
export function DetailToggle({ open, onPress }: DetailToggleProps) {
  // useRef(new Animated.Value(...)).current は「レンダー中の ref 参照」として
  // lint に弾かれるため、遅延初期化した state で1つの Animated.Value を保持する
  const [progress] = useState(() => new Animated.Value(open ? 1 : 0));
  const iconColor = useThemeColor('text');

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 180,
      // react-native-web にはネイティブアニメーションモジュールが無く、
      // true のままだと毎回フォールバックの警告が出る
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [open, progress]);

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      className="min-h-[44px] flex-row items-center justify-between rounded-xl bg-surface px-four dark:bg-surface-dark">
      <Text className="text-sm text-fg dark:text-fg-dark">
        {open ? '詳細を閉じる' : '詳細を入力（任意）'}
      </Text>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <FontAwesome6 name="angle-down" solid size={16} color={iconColor} />
      </Animated.View>
    </Pressable>
  );
}
